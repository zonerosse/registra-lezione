# -*- coding: utf-8 -*-
"""
Registra Lezione - parte che lavora sul materiale registrato.

L'audio e' registrato a pezzi da un'ora: audio_001.wav, audio_002.wav, ...
  - durante la lezione, appena un'ora finisce, quella parte viene trascritta e
    diventa un pacchetto .zip "per Claude" (PDF + testo) nella cartella scelta;
  - a fine lezione si prepara anche la lezione completa:
      video.mp4                 video con l'audio
      Lezione.html              il file da leggere: ogni slide con sotto le parole del docente
      Per Claude - <nome>.pdf   la lezione intera in PDF
      trascrizione.txt          solo il testo, con gli orari
"""
import base64
import datetime
import html
import json
import logging
import os
import shutil
import subprocess
import sys
import threading
import wave
import zipfile
from pathlib import Path

log = logging.getLogger("registra_lezione")

import testi                     # noqa: E402
from testi import tr             # noqa: E402

# Modello di trascrizione: "small" e' un buon compromesso velocita'/qualita'.
MODELLO_WHISPER = os.environ.get("RL_MODELLO", "small")
LINGUA = "it"
# Durata di una parte (secondi). Per le prove si puo' accorciare con la variabile RL_PARTE_SECONDI.
PARTE_SECONDI = int(os.environ.get("RL_PARTE_SECONDI", "3600"))


def parte_secondi(cartella=None):
    """Durata delle parti di QUESTA lezione (si sceglie in Impostazioni: 30 minuti o 1 ora).
    Le lezioni registrate prima di poterla scegliere hanno parti da un'ora."""
    if os.environ.get("RL_PARTE_SECONDI"):
        return int(os.environ["RL_PARTE_SECONDI"])
    if cartella is not None:
        for nome in ("info.json", "meta.json"):
            v = (leggi_json(Path(cartella) / nome, {}) or {}).get("parte_secondi")
            if v:
                return int(v)
    return 3600

NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


# --------------------------------------------------------------------------- utilita'

def hms(sec):
    sec = max(0, int(round(sec)))
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def ore_min(sec):
    """Per i nomi dei file: 3600 -> '01h', 9420 -> '02h37'."""
    sec = int(round(sec))
    h, r = divmod(sec, 3600)
    m = r // 60
    return f"{h:02d}h" if m == 0 else f"{h:02d}h{m:02d}"


def durata_leggibile(sec):
    sec = int(sec or 0)
    h, r = divmod(sec, 3600)
    m = r // 60
    return f"{h} h {m:02d} min" if h else f"{m} min"


def nome_sicuro(s):
    s = (s or "").replace("/", "-").replace("\\", "-")
    s = "".join(c for c in s if c not in '<>:"|?*').strip().rstrip(".")
    return s[:80] or "Lezione"


def ffmpeg_exe():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def leggi_json(p, default=None):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except Exception:
        return default


def scrivi_json(p, dati):
    """Scrive il file in modo sicuro. Se Windows lo tiene occupato un attimo (antivirus,
    indicizzazione), riprova per qualche secondo invece di dare errore."""
    import time
    p = Path(p)
    testo = json.dumps(dati, ensure_ascii=False, indent=1)
    for n in range(20):
        tmp = p.with_name(f"{p.name}.{os.getpid()}.{threading.get_ident()}.{n}.tmp")
        try:
            tmp.write_text(testo, encoding="utf-8")
            os.replace(tmp, p)
            return
        except PermissionError:
            try:
                tmp.unlink()
            except OSError:
                pass
            if n == 19:
                raise
            time.sleep(0.25)


_BLOCCO_INFO = threading.RLock()     # piu' lavori insieme (trascrizione, voci, appunti) aggiornano info.json


def aggiorna_info(cartella, **campi):
    p = Path(cartella) / "info.json"
    with _BLOCCO_INFO:
        info = leggi_json(p, {}) or {}
        info.update(campi)
        scrivi_json(p, info)
    return info


def file_parti(cartella):
    """{numero_parte: percorso audio} per le parti registrate."""
    out = {}
    for p in Path(cartella).glob("audio_*.wav"):
        try:
            out[int(p.stem.split("_")[1])] = p
        except (IndexError, ValueError):
            pass
    return dict(sorted(out.items()))


def durata_wav(p):
    try:
        with wave.open(str(p)) as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        return 0.0


def riga_studente(info):
    """'Lorenzo Boldrini · Ingegneria, 1° anno · Università di Ferrara' (solo i dati inseriti)."""
    d = info.get("studente") or {}
    corso = d.get("corso", "")
    if d.get("anno"):
        anno = tr("anno", testi.lingua_di(info))
        corso = f"{corso}, {d['anno']} {anno}" if corso else f"{d['anno']} {anno}"
    return " · ".join(x for x in (d.get("nome", ""), corso, d.get("universita", "")) if x)


def _data_it(iso):
    try:
        return datetime.datetime.fromisoformat(iso).strftime("%d/%m/%Y")
    except Exception:
        return ""


# --------------------------------------------------------------------------- trascrizione

def audio_16k(wav):
    """Legge l'audio come serve al modello (mono, 16 kHz, numeri decimali) usando ffmpeg.
    Cosi' non serve la libreria PyAV per decodificare (la versione nuova non va d'accordo
    con faster-whisper: "unexpected keyword argument 'metadata_errors'")."""
    import numpy as np
    r = subprocess.run([ffmpeg_exe(), "-nostdin", "-loglevel", "error", "-i", str(wav),
                        "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=NO_WINDOW)
    if r.returncode != 0:
        raise RuntimeError("lettura audio non riuscita: " + r.stderr.decode("utf-8", "replace")[-500:])
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


SOVRAPPOSIZIONE = 6    # secondi della parte precedente riascoltati all'inizio di ogni parte


def trascrivi_parte(cartella, k, progresso=lambda f: None, threads=None):
    """Trascrive audio_00k.wav. Orari gia' riferiti all'inizio della lezione.
    Salva trascrizione_00k.json (se esiste gia' la riusa)."""
    cartella = Path(cartella)
    pj = cartella / f"trascrizione_{k:03d}.json"
    gia = leggi_json(pj)
    if gia is not None:
        progresso(1.0)
        return chi_parla(cartella, k, gia)
    wav = cartella / f"audio_{k:03d}.wav"
    if not wav.exists() or durata_wav(wav) < 1:
        scrivi_json(pj, [])
        progresso(1.0)
        return []
    import time
    if threads is None:
        threads = max(1, (os.cpu_count() or 2) - 1)
    model = _modello(threads)
    t0 = time.monotonic()
    info_lez = leggi_json(cartella / "info.json", {}) or {}
    lingua = info_lez.get("lingua_lezione") or LINGUA
    parole = parole_lezione(cartella)
    audio = audio_16k(wav)
    # parole perse: le parti sono tagliate al campione, quindi una parola puo' finire a cavallo di due
    # parti. Davanti a questa parte metto gli ultimi secondi della precedente e tengo le frasi che
    # arrivano dentro questa parte (anche quelle cominciate un attimo prima del taglio).
    prima = 0.0
    prec = cartella / f"audio_{k - 1:03d}.wav"
    if k > 1 and prec.exists():
        try:
            import numpy as np
            coda = audio_16k(prec)[-SOVRAPPOSIZIONE * 16000:]
            prima = len(coda) / 16000
            audio = np.concatenate([coda, audio])
        except Exception:
            log.exception("sovrapposizione parte %s", k)
            prima = 0.0
    segmenti, info = model.transcribe(
        audio, language=None if lingua == "auto" else lingua, vad_filter=True,
        beam_size=5 if info_lez.get("precisa") else 1,       # "trascrizione piu' precisa" (Impostazioni)
        condition_on_previous_text=False, hotwords=", ".join(parole) if parole else None)
    if lingua == "auto" and getattr(info, "language", None):
        aggiorna_info(cartella, lingua_rilevata=info.language)
    offset = (k - 1) * parte_secondi(cartella)
    durata = info.duration or 1.0
    out = []
    for s in segmenti:
        testo = (s.text or "").strip()
        if testo and s.end > prima + 0.3:        # finita del tutto prima del taglio: e' gia' nella parte prima
            out.append({"inizio": round(offset + max(0.0, s.start - prima), 2),
                        "fine": round(offset + s.end - prima, 2), "testo": testo})
        progresso(min(1.0, s.end / durata))
    progresso(1.0)
    scrivi_json(pj, out)
    log.info("trascrizione parte %s: %.0f s di audio in %.0f s (%s thread)", k, durata,
             time.monotonic() - t0, threads)
    return chi_parla(cartella, k, out)


DOPO_VOCI = None       # il motore ci mette una funzione(cartella): Claude suggerisce i nomi delle voci


def chi_parla(cartella, k, segmenti):
    """«Chi parla»: da' una voce a ogni frase della parte k (se l'opzione e' attiva e non e' gia' fatto).
    Se qualcosa va storto (es. niente internet per scaricare il modello la prima volta) la trascrizione resta com'e'."""
    info = leggi_json(Path(cartella) / "info.json", {}) or {}
    if not info.get("chi_parla") or not segmenti:
        return segmenti
    try:
        import voci
        if voci.fatta(cartella, k):
            return segmenti
        voci.assegna(cartella, k)
        if DOPO_VOCI:
            try:
                DOPO_VOCI(cartella)
            except Exception:
                log.exception("nomi delle voci")
        return leggi_json(Path(cartella) / f"trascrizione_{k:03d}.json", segmenti) or segmenti
    except Exception:
        log.exception("chi parla, parte %s", k)
        return segmenti


_MODELLO = {}


def parole_lezione(cartella):
    """Le "parole difficili" della materia (nomi, termini tecnici) salvate con la lezione."""
    p = (leggi_json(Path(cartella) / "info.json", {}) or {}).get("parole") or []
    return [str(x).strip() for x in p if str(x).strip()][:40]


def modello_in_uso(threads):
    """Per il testo in diretta: lo stesso modello gia' caricato (se c'e'), cosi' non se ne carica un altro."""
    if _MODELLO:
        return next(iter(_MODELLO.values()))
    return _modello(threads)


def _modello(threads):
    """Il modello di trascrizione resta caricato fra una parte e l'altra (caricarlo costa secondi).
    Se e' gia' sul PC non si chiede niente a internet."""
    chiave = (MODELLO_WHISPER, threads)
    if chiave not in _MODELLO:
        from faster_whisper import WhisperModel
        _MODELLO.clear()
        _MODELLO[chiave] = WhisperModel(MODELLO_WHISPER, device="cpu", compute_type="int8", cpu_threads=threads,
                                        local_files_only=modello_presente())
    return _MODELLO[chiave]


def modello_presente():
    try:
        from faster_whisper.utils import download_model
        download_model(MODELLO_WHISPER, local_files_only=True)
        return True
    except Exception:
        return False


def scarica_modello():
    from faster_whisper.utils import download_model
    download_model(MODELLO_WHISPER)


# --------------------------------------------------------------------------- slide + parole

def slide_in_tempo_audio(meta, cartella=None):
    """Orari delle slide riportati sull'orologio dell'audio (0 = inizio audio).
    Con la cartella, le foto che sono solo la continuazione della precedente
    (lavagna scritta a mano poco alla volta) diventano una sola: l'ultima, completa."""
    if cartella is not None and not meta.get("slides") and (Path(cartella) / "docente.json").exists():
        # lezione senza foto dello schermo (in aula) ma con le slide del docente: le pagine sono gia'
        # sulla linea del tempo dell'audio
        ev = (leggi_json(Path(cartella) / "docente.json", {}) or {}).get("eventi") or []
        return sorted(({"file": e["file"], "t": float(e["t"])} for e in ev), key=lambda s: s["t"])
    a0 = float(meta.get("audio_t0") or 0)
    slides = sorted(({"file": s["file"], "t": max(0.0, float(s["t"]) - a0)}
                     for s in meta.get("slides", [])), key=lambda s: s["t"])
    if cartella is not None:
        slides = unisci_progressive(slides, Path(cartella) / "slide")
    return slides


def _tratto_lungo(maschera):
    """Inizio e fine del tratto piu' lungo di True in un vettore."""
    meglio, inizio, corrente = (0, 0), None, None
    for i, v in enumerate(list(maschera) + [False]):
        if v and corrente is None:
            corrente = i
        elif not v and corrente is not None:
            if i - corrente > meglio[1] - meglio[0]:
                meglio = (corrente, i)
            corrente = None
    return meglio


def zona_contenuto(img):
    """Trova il riquadro della presentazione condivisa (slide, grafico, lavagna) dentro lo
    schermo intero di Meet: e' la zona grande e piena che si stacca dallo sfondo della
    finestra. Ritorna (x0, y0, x1, y1) in pixel, oppure None se non e' sicuro."""
    import numpy as np
    W, H = img.size
    k = 4
    g = np.asarray(img.convert("L").resize((max(1, W // k), max(1, H // k))), dtype=np.int16)
    h, w = g.shape
    bordo = np.concatenate([g[: h // 20].ravel(), g[-h // 20:].ravel(), g[:, : w // 20].ravel(), g[:, -w // 20:].ravel()])
    sfondo = int(np.bincount((bordo // 8).astype(np.int64)).argmax()) * 8 + 4
    m = np.abs(g - sfondo) > 25
    x0, x1 = _tratto_lungo(m.mean(axis=0) > 0.35)
    if x1 - x0 < w * 0.3:
        return None
    y0, y1 = _tratto_lungo(m[:, x0:x1].mean(axis=1) > 0.35)
    if y1 - y0 < h * 0.3:
        return None
    area = (x1 - x0) * (y1 - y0) / float(w * h)
    if area > 0.93:                 # e' gia' tutto schermo: non c'e' niente da tagliare
        return None
    pad = 2
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(w, x1 + pad), min(h, y1 + pad)
    return (x0 * k, y0 * k, min(W, x1 * k), min(H, y1 * k))


def immagine_slide(cartella, nome, originale=False):
    """Percorso della slide da mettere nei PDF: ritagliata sulla presentazione se si puo'.
    L'originale (schermo intero) resta in slide/, il ritaglio va in slide/ritagli/.
    Se sono state aggiunte le slide del docente in PDF, al posto della foto va la pagina giusta
    (originale=True: sempre la foto dello schermo, ritagliata)."""
    from PIL import Image
    orig = Path(cartella) / "slide" / nome
    if nome.startswith("docente_"):
        return orig
    if not originale and (Path(cartella) / "docente.json").exists():
        sost = (leggi_json(Path(cartella) / "docente.json", {}) or {}).get("sostituzioni") or {}
        if sost.get(nome) and (Path(cartella) / "slide" / sost[nome]).exists():
            return Path(cartella) / "slide" / sost[nome]
    rit = Path(cartella) / "slide" / "ritagli" / nome
    if rit.exists():
        return rit
    try:
        with Image.open(orig) as im:
            zona = zona_contenuto(im)
            if zona is None:
                return orig
            rit.parent.mkdir(exist_ok=True)
            im.crop(zona).convert("RGB").save(rit, "JPEG", quality=85)
        return rit
    except Exception:
        log.exception("ritaglio slide %s", nome)
        return orig


def _grigio_ridotto(percorso):
    import numpy as np
    from PIL import Image
    with Image.open(percorso) as im:
        return np.asarray(im.convert("L").resize((320, 180), Image.BILINEAR), dtype=np.int16)


def continuazione(a, b):
    """True se l'immagine b e' l'immagine a con solo cose AGGIUNTE (nulla cancellato).
    a, b: matrici in grigio della stessa misura.
    Sfondo = il grigio piu' frequente di a. Si contano:
      - aggiunte:  in a era sfondo, in b non piu'  (il docente ha scritto)
      - cancellate: in a c'era qualcosa, in b e' tornato sfondo (lavagna cancellata, slide cambiata)
    Le zone che cambiano senza essere sfondo (il riquadro con la faccia del docente) non contano."""
    import numpy as np
    sfondo = int(np.bincount((a // 8).ravel().astype(np.int64)).argmax()) * 8 + 4
    fa = np.abs(a - sfondo) <= 40
    fb = np.abs(b - sfondo) <= 40
    aggiunte = int((fa & ~fb).sum())
    cancellate = int((~fa & fb).sum())
    if aggiunte + cancellate == 0:
        return True                         # identiche
    return cancellate <= 0.004 * a.size and cancellate <= 0.15 * (aggiunte + cancellate)


def unisci_progressive(slides, cartella_slide):
    out, ultima = [], None
    for s in slides:
        p = Path(cartella_slide) / s["file"]
        try:
            img = _grigio_ridotto(p)
        except Exception:
            out.append(dict(s))
            ultima = None
            continue
        if out and ultima is not None and continuazione(ultima, img):
            out[-1]["file"] = s["file"]          # tengo l'orario d'inizio, ma la foto piu' completa
        else:
            out.append(dict(s))
        ultima = img
    return out


def raggruppa(slides, segmenti, inizio, fine):
    """Mette ogni frase sotto la slide che era sullo schermo in quel momento,
    nel tratto [inizio, fine). slides e segmenti sono sull'orologio dell'audio.
    Ritorna [{"slide": file|None, "inizio", "fine", "paragrafi": [str]}]."""
    prima = [s for s in slides if s["t"] <= inizio]
    scelte = [{"file": prima[-1]["file"], "t": inizio}] if prima else []
    scelte += [s for s in slides if inizio < s["t"] < fine]
    if not scelte:
        scelte = [{"file": None, "t": inizio}]
    scelte[0] = {"file": scelte[0]["file"], "t": inizio}

    gruppi = []
    for i, s in enumerate(scelte):
        f = scelte[i + 1]["t"] if i + 1 < len(scelte) else max(fine, s["t"])
        gruppi.append({"slide": s["file"], "inizio": s["t"], "fine": f, "frasi": []})

    j = 0
    for seg in segmenti:
        mezzo = (seg["inizio"] + seg["fine"]) / 2
        if mezzo < inizio or mezzo >= fine:
            continue
        while j + 1 < len(gruppi) and mezzo >= gruppi[j + 1]["inizio"]:
            j += 1
        gruppi[j]["frasi"].append(seg)

    # «Chi parla»: con almeno due voci ogni cambio di voce e' un paragrafo nuovo che comincia con il nome
    con_voci = len({seg.get("chi") for seg in segmenti if seg.get("chi")}) >= 2
    for g in gruppi:
        paragrafi, corrente, ultimo, chi = [], [], None, None
        for seg in g["frasi"]:
            cambia = con_voci and seg.get("chi") and seg.get("chi") != chi
            # pausa lunga = nuovo paragrafo, cosi' il testo non e' un muro unico
            if corrente and ultimo is not None and (cambia or seg["inizio"] - ultimo > 2.5 or len(corrente) >= 6):
                paragrafi.append(" ".join(corrente))
                corrente = []
            if con_voci and seg.get("chi") and (cambia or not corrente):
                chi = seg["chi"]
                corrente.append(f"{chi}: {seg['testo']}" if not corrente else seg["testo"])
            else:
                corrente.append(seg["testo"])
            ultimo = seg["fine"]
        if corrente:
            paragrafi.append(" ".join(corrente))
        g["paragrafi"] = paragrafi
        del g["frasi"]
    return gruppi


# --------------------------------------------------------------------------- file da leggere

def crea_html(cartella, info, gruppi):
    cartella = Path(cartella)
    L = testi.lingua_di(info)
    nome = html.escape(info.get("nome", "Lezione"))
    n_sl = len([g for g in gruppi if g["slide"]])
    sottotitolo = f"{_data_it(info.get('inizio', ''))} · {tr('tr_durata', L)} {durata_leggibile(info.get('durata', 0))} · {n_sl} slide"
    indice, blocchi = [], []
    for n, g in enumerate(gruppi, 1):
        ora = f"{hms(g['inizio'])} – {hms(g['fine'])}"
        if g["slide"]:
            dati = base64.b64encode(immagine_slide(cartella, g["slide"]).read_bytes()).decode()
            img = f'<a href="#" class="zoom"><img src="data:image/jpeg;base64,{dati}" alt="Slide {n}"></a>'
        else:
            img = f'<div class="noimg">{tr("tr_noimg", L)}</div>'
        testo = "".join(f"<p>{html.escape(p)}</p>" for p in g["paragrafi"]) or \
            f'<p class="vuoto">{html.escape(tr("tr_silenzio", L))}</p>'
        indice.append(f'<a href="#s{n}"><b>{n}</b> <span>{hms(g["inizio"])}</span></a>')
        blocchi.append(f'<section id="s{n}"><div class="ora">Slide {n} · {ora}</div>{img}<div class="t">{testo}</div></section>')

    pagina = f"""<!doctype html>
<html lang="{L}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{nome}</title>
<style>
:root{{--bg:#e9edf2;--card:#fff;--ink:#1d2430;--muted:#6b7686;--line:#dde2e9;--blue:#2563eb}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);font-family:"Segoe UI",system-ui,sans-serif;color:var(--ink);padding:24px 16px}}
main{{max-width:860px;margin:0 auto}}
header{{background:var(--card);border:1px solid #c9d0da;border-radius:8px;padding:20px 22px}}
h1{{margin:0 0 4px;font-size:24px}}
.sub{{color:var(--muted);font-size:14px}}
.nota{{color:var(--muted);font-size:13px;margin-top:10px}}
nav{{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}}
nav a{{text-decoration:none;color:var(--ink);background:#f6f8fb;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:13px}}
nav a span{{color:var(--blue)}}
section{{background:var(--card);border:1px solid #c9d0da;border-radius:8px;padding:18px 22px;margin-top:14px}}
.ora{{font-size:13px;color:var(--blue);font-weight:600;margin-bottom:10px}}
section img{{width:100%;border:1px solid var(--line);border-radius:4px;display:block;cursor:zoom-in}}
.noimg{{background:#f6f8fb;border:1px dashed var(--line);border-radius:4px;padding:20px;text-align:center;color:var(--muted)}}
.t{{margin-top:12px;font-size:16px;line-height:1.6}}
.t p{{margin:0 0 10px}}
.vuoto{{color:var(--muted);font-style:italic}}
#big{{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;cursor:zoom-out}}
#big img{{max-width:96vw;max-height:96vh}}
@media print{{body{{background:#fff}}nav,#big{{display:none}}section{{break-inside:avoid}}}}
</style></head><body><main>
<header><h1>{nome}</h1><div class="sub">{sottotitolo}</div>{('<div class="sub">' + html.escape(riga_studente(info)) + '</div>') if riga_studente(info) else ''}
<div class="nota">{html.escape(tr("tr_nota", L))}</div>
<nav>{''.join(indice)}</nav></header>
{''.join(blocchi)}
</main><div id="big"><img alt=""></div>
<script>
var big=document.getElementById('big');
document.querySelectorAll('.zoom').forEach(function(a){{a.onclick=function(e){{e.preventDefault();big.firstChild.src=a.firstChild.src;big.style.display='flex';}};}});
big.onclick=function(){{big.style.display='none';}};
</script></body></html>"""
    (cartella / "Lezione.html").write_text(pagina, encoding="utf-8")


# font DejaVu: su Linux sono di sistema, nell'app Android sono dentro l'app (RL_FONT_DIR)
CARTELLA_FONT = Path(os.environ.get("RL_FONT_DIR") or "/usr/share/fonts/truetype/dejavu")


def _font_pdf(pdf):
    """Usa Arial di Windows (accenti e simboli ok); altrimenti un font di base."""
    windir = Path(os.environ.get("WINDIR", r"C:\Windows"))
    candidati = [
        (windir / "Fonts" / "arial.ttf", windir / "Fonts" / "arialbd.ttf"),
        (CARTELLA_FONT / "DejaVuSans.ttf", CARTELLA_FONT / "DejaVuSans-Bold.ttf"),
    ]
    for reg, bold in candidati:
        if reg.exists() and bold.exists():
            pdf.add_font("F", "", str(reg))
            pdf.add_font("F", "B", str(bold))
            return "F", False
    return "helvetica", True


def crea_pdf(cartella, info, gruppi, destinazione, sottotitolo_extra=""):
    from fpdf import FPDF
    from PIL import Image
    cartella = Path(cartella)
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(True, margin=15)
    pdf.set_margins(15, 15, 15)
    font, solo_latin = _font_pdf(pdf)

    def t(s):
        if solo_latin:
            s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"') \
                 .replace("…", "...").replace("–", "-").replace("—", "-")
            return s.encode("latin-1", "replace").decode("latin-1")
        return s

    L = testi.lingua_di(info)
    n_sl = len([g for g in gruppi if g["slide"]])
    pdf.add_page()
    pdf.set_font(font, "B", 18)
    pdf.multi_cell(0, 9, t(info.get("nome", "Lezione")), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(font, "", 11)
    riga = f"{_data_it(info.get('inizio', ''))}"
    if sottotitolo_extra:
        riga += f" - {sottotitolo_extra}"
    else:
        riga += f" - {tr('tr_durata', L)} {durata_leggibile(info.get('durata', 0))}"
    riga += f" - {n_sl} slide"
    pdf.multi_cell(0, 6, t(riga), new_x="LMARGIN", new_y="NEXT")
    if riga_studente(info):
        pdf.multi_cell(0, 6, t(riga_studente(info)), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font(font, "", 9.5)
    pdf.set_text_color(90, 100, 115)
    pdf.multi_cell(0, 5, t(tr("tr_intro", L)),
                   new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    larg = pdf.w - 30
    pdf.ln(4)
    for n, g in enumerate(gruppi, 1):
        # niente pagina nuova per ogni slide: una dopo l'altra, piu' piccole
        alt, w_mm = 0.0, 0.0
        if g["slide"]:
            p = immagine_slide(cartella, g["slide"])
            with Image.open(p) as im:
                w, h = im.size
            w_mm = min(120.0, larg)
            alt = w_mm * h / w
            if alt > 80:
                alt, w_mm = 80.0, 80.0 * w / h
        if pdf.get_y() + 10 + alt + 12 > pdf.h - 15:
            pdf.add_page()
        if n > 1:
            pdf.set_draw_color(221, 226, 233)
            pdf.line(15, pdf.get_y(), pdf.w - 15, pdf.get_y())
            pdf.ln(3)
        pdf.set_font(font, "B", 10.5)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(0, 6, t(f"Slide {n}  ·  {hms(g['inizio'])} - {hms(g['fine'])}"),
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        if g["slide"]:
            pdf.image(str(p), x=15 + (larg - w_mm) / 2, w=w_mm, h=alt)
            pdf.ln(2)
        pdf.set_font(font, "", 10)
        if g["paragrafi"]:
            for par in g["paragrafi"]:
                pdf.multi_cell(0, 5, t(par), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)
        else:
            pdf.set_text_color(110, 118, 134)
            pdf.multi_cell(0, 5, t(tr("tr_nessuna", L)), new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        pdf.ln(3)
    pdf.output(str(destinazione))


def crea_txt(info, gruppi, segmenti, destinazione, titolo_extra=""):
    righe = [info.get("nome", "Lezione") + (f" - {titolo_extra}" if titolo_extra else ""),
             _data_it(info.get("inizio", "")), ""]
    for n, g in enumerate(gruppi, 1):
        righe.append(f"=== Slide {n} ({hms(g['inizio'])} - {hms(g['fine'])}) ===")
        righe += g["paragrafi"] or [tr("tr_nessuna_breve", testi.lingua_di(info))]
        righe.append("")
    righe.append("")
    righe.append(f"=== {tr('tr_completa', testi.lingua_di(info))} ===")
    con_voci = len({s.get("chi") for s in segmenti if s.get("chi")}) >= 2
    for s in segmenti:
        chi = f"{s['chi']}: " if con_voci and s.get("chi") else ""
        righe.append(f"[{hms(s['inizio'])}] {chi}{s['testo']}")
    Path(destinazione).write_text("\n".join(righe), encoding="utf-8")


# --------------------------------------------------------------------------- pacchetto di una parte

def crea_pacchetto(cartella, k, cartella_pacchetti):
    """Crea '<nome> – parte k (00h-01h).zip' con PDF e testo di quella parte."""
    cartella = Path(cartella)
    info = leggi_json(cartella / "info.json", {}) or {}
    meta = leggi_json(cartella / "meta.json", {}) or {}
    if (cartella / "docente.json").exists():      # slide del docente: abbinamento con la trascrizione nuova
        import docente
        docente.allinea(cartella)
    segmenti = leggi_json(cartella / f"trascrizione_{k:03d}.json", []) or []
    inizio = (k - 1) * parte_secondi(cartella)
    fine = inizio + durata_wav(cartella / f"audio_{k:03d}.wav")
    if fine <= inizio and segmenti:
        fine = max(s["fine"] for s in segmenti)
    gruppi = raggruppa(slide_in_tempo_audio(meta, cartella), segmenti, inizio, fine)

    L = testi.lingua_di(info)
    etichetta = f"{tr('parte', L)} {k} ({ore_min(inizio)}-{ore_min(fine)})"
    # data e ora nel nome: due lezioni con lo stesso nome non si sovrascrivono i pacchetti
    try:
        ore = tr("ore", L)
        quando = datetime.datetime.fromisoformat(info.get("inizio", "")).strftime(
            f"%d-%m {ore} %H.%M" if ore else "%d-%m %H.%M")
    except Exception:
        quando = ""
    base = " – ".join(x for x in (nome_sicuro(info.get("nome")), quando, etichetta) if x)
    lavoro = cartella / "pacchetti"
    lavoro.mkdir(exist_ok=True)
    pdf = lavoro / f"{base}.pdf"
    txt = lavoro / f"{base}.txt"
    crea_pdf(cartella, info, gruppi, pdf,
             sottotitolo_extra=tr("tr_parte_di", L, e=etichetta, a=hms(inizio), b=hms(fine)))
    crea_txt(info, gruppi, segmenti, txt, titolo_extra=etichetta)

    dest = Path(cartella_pacchetti)
    dest.mkdir(parents=True, exist_ok=True)
    zp = dest / f"{base}.zip"
    tmp = zp.with_name(zp.name + ".tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(pdf, pdf.name)
        z.write(txt, txt.name)
    os.replace(tmp, zp)

    # quale immagine e' la "Slide N" del PDF di questa parte (serve agli appunti)
    scrivi_json(cartella / f"pacchetto_{k:03d}.json",
                [{"n": n, "file": g["slide"], "inizio": g["inizio"]} for n, g in enumerate(gruppi, 1)])
    pacchetti = info.get("pacchetti") or {}
    pacchetti[str(k)] = str(zp)
    aggiorna_info(cartella, pacchetti=pacchetti)
    return zp


# --------------------------------------------------------------------------- video

def unisci_video(cartella, meta):
    """Unisce il video (senza audio) e le parti audio in video.mp4, sincronizzati."""
    cartella = Path(cartella)
    mkv, out = cartella / "video_tmp.mkv", cartella / "video.mp4"
    parti = file_parti(cartella)
    if out.exists() and not mkv.exists():
        return True
    ha_video = mkv.exists() and mkv.stat().st_size > 1000
    ha_audio = any(durata_wav(p) > 0 for p in parti.values())
    if not ha_video and not ha_audio:
        return False
    ff = ffmpeg_exe()
    audio_in = []
    if ha_audio:
        lista = cartella / "audio_lista.txt"
        lista.write_text("".join(f"file '{p.name}'\n" for p in parti.values()), encoding="utf-8")
        audio_in = ["-f", "concat", "-safe", "0", "-i", str(lista)]
    if ha_video:
        cmd = [ff, "-y", "-i", str(mkv)]
        if ha_audio:
            offset = float(meta.get("audio_t0") or 0) - float(meta.get("video_t0") or 0)
            cmd += ["-itsoffset", f"{offset:.3f}"] + audio_in + \
                   ["-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "96k"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", str(out)]
    else:
        out = cartella / "audio.m4a"
        cmd = [ff, "-y"] + audio_in + ["-c:a", "aac", "-b:a", "96k", str(out)]
    log.info("ffmpeg: %s", " ".join(cmd))
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                       creationflags=NO_WINDOW)
    if r.returncode != 0 or not out.exists():
        log.error("unione video fallita: %s", r.stderr.decode("utf-8", "replace")[-2000:])
        return False
    for p in (mkv, cartella / "audio_lista.txt"):
        try:
            p.unlink()
        except OSError:
            pass
    return True


# --------------------------------------------------------------------------- lezione completa

def crea_completa(cartella, segmenti=None, avanzamento=lambda f: None):
    """Lezione.html, «Per Claude - ....pdf» e trascrizione.txt di tutta la registrazione
    (si rifanno anche dopo aver dato i nomi alle voci)."""
    cartella = Path(cartella)
    meta = leggi_json(cartella / "meta.json", {}) or {}
    if segmenti is None:
        segmenti = []
        for p in sorted(cartella.glob("trascrizione_*.json")):
            segmenti += leggi_json(p, []) or []
    info = leggi_json(cartella / "info.json", {}) or {}
    durata = info.get("durata") or sum(durata_wav(p) for p in file_parti(cartella).values())
    if not durata and segmenti:
        durata = max(s["fine"] for s in segmenti)
    gruppi = raggruppa(slide_in_tempo_audio(meta, cartella), segmenti, 0, max(durata, 1))
    info = aggiorna_info(cartella, durata=round(durata), n_slide=len([g for g in gruppi if g["slide"]]))
    crea_html(cartella, info, gruppi)
    avanzamento(0.92)
    crea_pdf(cartella, info, gruppi, cartella / f"Per Claude - {nome_sicuro(info.get('nome'))}.pdf")
    crea_txt(info, gruppi, segmenti, cartella / "trascrizione.txt")
    avanzamento(0.97)


def elabora_finale(cartella, cartella_pacchetti, avanzamento=lambda f: None, threads=None):
    """A fine lezione: parti mancanti, video, lezione completa. avanzamento(0..1)."""
    cartella = Path(cartella)
    meta = leggi_json(cartella / "meta.json", {}) or {}
    info = aggiorna_info(cartella, stato="elaborazione")
    parti = list(file_parti(cartella))

    # 1. parti non ancora trascritte / impacchettate (es. dopo un'interruzione)
    n = max(1, len(parti))
    segmenti = []
    for i, k in enumerate(parti):
        segmenti += trascrivi_parte(cartella, k, lambda f, i=i: avanzamento(0.8 * (i + f) / n), threads)
        if str(k) not in (leggi_json(cartella / "info.json", {}) or {}).get("pacchetti", {}):
            try:
                crea_pacchetto(cartella, k, cartella_pacchetti)
            except Exception:
                log.exception("pacchetto parte %s", k)
    avanzamento(0.8)

    # 2. video
    video_ok = unisci_video(cartella, meta)
    avanzamento(0.88)

    # 3. lezione completa
    crea_completa(cartella, segmenti, avanzamento)

    # 4. pulizia: l'audio grezzo e' enorme, lo tolgo se e' gia' dentro video.mp4 / audio.m4a
    if video_ok and ((cartella / "video.mp4").exists() or (cartella / "audio.m4a").exists()):
        for p in file_parti(cartella).values():
            try:
                p.unlink()
            except OSError:
                pass
    for p in (cartella / "ffmpeg.log",):
        if p.exists() and p.stat().st_size == 0:
            try:
                p.unlink()
            except OSError:
                pass
    shutil.rmtree(cartella / "pacchetti", ignore_errors=True)
    # «Chi parla»: a registrazione pronta nessuna impronta della voce resta sul disco
    try:
        import voci
        voci.dimentica(cartella)
    except Exception:
        log.exception("cancello le impronte delle voci")
    info = aggiorna_info(cartella, stato="pronta")
    avanzamento(1.0)
    return info
