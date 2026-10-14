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
import wave
import zipfile
from pathlib import Path

log = logging.getLogger("registra_lezione")

# Modello di trascrizione: "small" e' un buon compromesso velocita'/qualita'.
MODELLO_WHISPER = "small"
LINGUA = "it"
# Durata di una parte (secondi). Per le prove si puo' accorciare con la variabile RL_PARTE_SECONDI.
PARTE_SECONDI = int(os.environ.get("RL_PARTE_SECONDI", "3600"))

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
    p = Path(p)
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(dati, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, p)


def aggiorna_info(cartella, **campi):
    p = Path(cartella) / "info.json"
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
        corso = f"{corso}, {d['anno']} anno" if corso else f"{d['anno']} anno"
    return " · ".join(x for x in (d.get("nome", ""), corso, d.get("universita", "")) if x)


def _data_it(iso):
    try:
        return datetime.datetime.fromisoformat(iso).strftime("%d/%m/%Y")
    except Exception:
        return ""


# --------------------------------------------------------------------------- trascrizione

def trascrivi_parte(cartella, k, progresso=lambda f: None, threads=None):
    """Trascrive audio_00k.wav. Orari gia' riferiti all'inizio della lezione.
    Salva trascrizione_00k.json (se esiste gia' la riusa)."""
    cartella = Path(cartella)
    pj = cartella / f"trascrizione_{k:03d}.json"
    gia = leggi_json(pj)
    if gia is not None:
        progresso(1.0)
        return gia
    wav = cartella / f"audio_{k:03d}.wav"
    if not wav.exists() or durata_wav(wav) < 1:
        scrivi_json(pj, [])
        progresso(1.0)
        return []
    from faster_whisper import WhisperModel
    if threads is None:
        threads = max(1, (os.cpu_count() or 2) - 1)
    model = WhisperModel(MODELLO_WHISPER, device="cpu", compute_type="int8", cpu_threads=threads)
    segmenti, info = model.transcribe(
        str(wav), language=LINGUA, vad_filter=True, beam_size=1,
        condition_on_previous_text=False)
    offset = (k - 1) * PARTE_SECONDI
    durata = info.duration or 1.0
    out = []
    for s in segmenti:
        testo = (s.text or "").strip()
        if testo:
            out.append({"inizio": round(offset + s.start, 2), "fine": round(offset + s.end, 2),
                        "testo": testo})
        progresso(min(1.0, s.end / durata))
    progresso(1.0)
    scrivi_json(pj, out)
    return out


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

def slide_in_tempo_audio(meta):
    """Orari delle slide riportati sull'orologio dell'audio (0 = inizio audio)."""
    a0 = float(meta.get("audio_t0") or 0)
    return sorted(({"file": s["file"], "t": max(0.0, float(s["t"]) - a0)}
                   for s in meta.get("slides", [])), key=lambda s: s["t"])


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

    for g in gruppi:
        paragrafi, corrente, ultimo = [], [], None
        for seg in g["frasi"]:
            # pausa lunga = nuovo paragrafo, cosi' il testo non e' un muro unico
            if corrente and ultimo is not None and (seg["inizio"] - ultimo > 2.5 or len(corrente) >= 6):
                paragrafi.append(" ".join(corrente))
                corrente = []
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
    nome = html.escape(info.get("nome", "Lezione"))
    n_sl = len([g for g in gruppi if g["slide"]])
    sottotitolo = f"{_data_it(info.get('inizio', ''))} · durata {durata_leggibile(info.get('durata', 0))} · {n_sl} slide"
    indice, blocchi = [], []
    for n, g in enumerate(gruppi, 1):
        ora = f"{hms(g['inizio'])} – {hms(g['fine'])}"
        if g["slide"]:
            dati = base64.b64encode((cartella / "slide" / g["slide"]).read_bytes()).decode()
            img = f'<a href="#" class="zoom"><img src="data:image/jpeg;base64,{dati}" alt="Slide {n}"></a>'
        else:
            img = '<div class="noimg">Nessuna slide catturata</div>'
        testo = "".join(f"<p>{html.escape(p)}</p>" for p in g["paragrafi"]) or \
            '<p class="vuoto">(in questo tratto il docente non ha parlato, o l\'audio non si sentiva)</p>'
        indice.append(f'<a href="#s{n}"><b>{n}</b> <span>{hms(g["inizio"])}</span></a>')
        blocchi.append(f'<section id="s{n}"><div class="ora">Slide {n} · {ora}</div>{img}<div class="t">{testo}</div></section>')

    pagina = f"""<!doctype html>
<html lang="it"><head><meta charset="utf-8">
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
<div class="nota">Il testo è una trascrizione automatica: può contenere qualche parola sbagliata. Tocca una slide per ingrandirla.</div>
<nav>{''.join(indice)}</nav></header>
{''.join(blocchi)}
</main><div id="big"><img alt=""></div>
<script>
var big=document.getElementById('big');
document.querySelectorAll('.zoom').forEach(function(a){{a.onclick=function(e){{e.preventDefault();big.firstChild.src=a.firstChild.src;big.style.display='flex';}};}});
big.onclick=function(){{big.style.display='none';}};
</script></body></html>"""
    (cartella / "Lezione.html").write_text(pagina, encoding="utf-8")


def _font_pdf(pdf):
    """Usa Arial di Windows (accenti e simboli ok); altrimenti un font di base."""
    windir = Path(os.environ.get("WINDIR", r"C:\Windows"))
    candidati = [
        (windir / "Fonts" / "arial.ttf", windir / "Fonts" / "arialbd.ttf"),
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
         Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
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

    n_sl = len([g for g in gruppi if g["slide"]])
    pdf.add_page()
    pdf.set_font(font, "B", 18)
    pdf.multi_cell(0, 9, t(info.get("nome", "Lezione")), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(font, "", 11)
    riga = f"{_data_it(info.get('inizio', ''))}"
    if sottotitolo_extra:
        riga += f" - {sottotitolo_extra}"
    else:
        riga += f" - durata {durata_leggibile(info.get('durata', 0))}"
    riga += f" - {n_sl} slide"
    pdf.multi_cell(0, 6, t(riga), new_x="LMARGIN", new_y="NEXT")
    if riga_studente(info):
        pdf.multi_cell(0, 6, t(riga_studente(info)), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font(font, "", 9.5)
    pdf.set_text_color(90, 100, 115)
    pdf.multi_cell(0, 5, t("Registrazione di una lezione universitaria seguita su Google Meet. "
                           "Ogni sezione contiene l'immagine della slide mostrata dal docente e, sotto, "
                           "la trascrizione automatica di quello che il docente ha detto mentre quella slide era "
                           "sullo schermo (con l'orario dall'inizio della lezione). "
                           "La trascrizione può contenere errori di riconoscimento."),
                   new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    larg = pdf.w - 30
    for n, g in enumerate(gruppi, 1):
        if n > 1:
            pdf.add_page()
        else:
            pdf.ln(6)
        pdf.set_font(font, "B", 12)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(0, 7, t(f"Slide {n}  ·  {hms(g['inizio'])} - {hms(g['fine'])}"),
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.ln(1)
        if g["slide"]:
            p = cartella / "slide" / g["slide"]
            with Image.open(p) as im:
                w, h = im.size
            alt = larg * h / w
            w_mm = larg
            if alt > 120:
                alt = 120
                w_mm = alt * w / h
            if pdf.get_y() + alt > pdf.h - 15:
                pdf.add_page()
            pdf.image(str(p), x=15 + (larg - w_mm) / 2, w=w_mm, h=alt)
            pdf.ln(4)
        pdf.set_font(font, "", 11)
        if g["paragrafi"]:
            for par in g["paragrafi"]:
                pdf.multi_cell(0, 5.6, t(par), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(2)
        else:
            pdf.set_text_color(110, 118, 134)
            pdf.multi_cell(0, 5.6, t("(nessuna parola in questo tratto)"), new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
    pdf.output(str(destinazione))


def crea_txt(info, gruppi, segmenti, destinazione, titolo_extra=""):
    righe = [info.get("nome", "Lezione") + (f" - {titolo_extra}" if titolo_extra else ""),
             _data_it(info.get("inizio", "")), ""]
    for n, g in enumerate(gruppi, 1):
        righe.append(f"=== Slide {n} ({hms(g['inizio'])} - {hms(g['fine'])}) ===")
        righe += g["paragrafi"] or ["(nessuna parola)"]
        righe.append("")
    righe.append("")
    righe.append("=== Trascrizione completa con orari ===")
    for s in segmenti:
        righe.append(f"[{hms(s['inizio'])}] {s['testo']}")
    Path(destinazione).write_text("\n".join(righe), encoding="utf-8")


# --------------------------------------------------------------------------- pacchetto di una parte

def crea_pacchetto(cartella, k, cartella_pacchetti):
    """Crea '<nome> – parte k (00h-01h).zip' con PDF e testo di quella parte."""
    cartella = Path(cartella)
    info = leggi_json(cartella / "info.json", {}) or {}
    meta = leggi_json(cartella / "meta.json", {}) or {}
    segmenti = leggi_json(cartella / f"trascrizione_{k:03d}.json", []) or []
    inizio = (k - 1) * PARTE_SECONDI
    fine = inizio + durata_wav(cartella / f"audio_{k:03d}.wav")
    if fine <= inizio and segmenti:
        fine = max(s["fine"] for s in segmenti)
    gruppi = raggruppa(slide_in_tempo_audio(meta), segmenti, inizio, fine)

    etichetta = f"parte {k} ({ore_min(inizio)}-{ore_min(fine)})"
    base = f"{nome_sicuro(info.get('nome'))} – {etichetta}"
    lavoro = cartella / "pacchetti"
    lavoro.mkdir(exist_ok=True)
    pdf = lavoro / f"{base}.pdf"
    txt = lavoro / f"{base}.txt"
    crea_pdf(cartella, info, gruppi, pdf,
             sottotitolo_extra=f"{etichetta} della lezione, da {hms(inizio)} a {hms(fine)}")
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
    info = leggi_json(cartella / "info.json", {}) or {}
    durata = info.get("durata") or sum(durata_wav(p) for p in file_parti(cartella).values())
    gruppi = raggruppa(slide_in_tempo_audio(meta), segmenti, 0, max(durata, 1))
    info = aggiorna_info(cartella, durata=round(durata), n_slide=len([g for g in gruppi if g["slide"]]))
    crea_html(cartella, info, gruppi)
    avanzamento(0.92)
    crea_pdf(cartella, info, gruppi, cartella / f"Per Claude - {nome_sicuro(info.get('nome'))}.pdf")
    crea_txt(info, gruppi, segmenti, cartella / "trascrizione.txt")
    avanzamento(0.97)

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
    info = aggiorna_info(cartella, stato="pronta")
    avanzamento(1.0)
    return info
