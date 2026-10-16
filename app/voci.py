# -*- coding: utf-8 -*-
"""
"Chi parla": separa le voci della registrazione, tutto sul PC (l'audio non va su internet).

Per ogni frase della trascrizione calcolo l'"impronta" della voce con un piccolo modello (WeSpeaker ResNet34,
26 MB, scaricato la prima volta) e la confronto con le voci gia' sentite in questa registrazione: se somiglia
abbastanza e' la stessa persona, altrimenti e' una voce nuova.

NESSUN DATO BIOMETRICO: le impronte servono solo mentre la registrazione viene elaborata. Stanno in un file
temporaneo (IMPRONTE) che viene cancellato quando la registrazione e' pronta (dimentica()); in voci.json
restano solo numero, nome e quanto parla ogni voce. Le voci di una registrazione stanno in voci.json;
i nomi si danno con «Dai i nomi alle voci» (oppure: lezione -> la voce che parla di piu' e' «Docente»).
Ogni frase della trascrizione riceve "voce" (numero) e "chi" (nome da mostrare).
"""
import json
import logging
import os
import ssl
import urllib.request
from pathlib import Path

import numpy as np

import elaborazione as el
from testi import tr

log = logging.getLogger("registra_lezione")

MODELLO_URL = ("https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/"
               "wespeaker_en_voxceleb_resnet34_LM.onnx")
SOGLIA = 0.50          # somiglianza (coseno) sopra la quale due frasi sono della stessa voce
MIN_SEC = 1.0          # frasi piu' corte: troppo poco per riconoscere bene la voce...
MIN_CORTA = 0.5        # ...si prova lo stesso, ma se non e' chiara prendono quella della frase vicina
MAX_VOCI = 12
_SESS = {}


def cartella_modelli():
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "share") / "RegistraLezione" / "modelli"
    base.mkdir(parents=True, exist_ok=True)
    return base


def file_modello():
    return cartella_modelli() / "voci_resnet34.onnx"


def modello_presente():
    f = file_modello()
    return f.exists() and f.stat().st_size > 20_000_000


def scarica_modello():
    f = file_modello()
    tmp = f.with_suffix(".part")
    req = urllib.request.Request(MODELLO_URL, headers={"User-Agent": "VerbaManentIA"})
    with urllib.request.urlopen(req, timeout=120, context=ssl.create_default_context()) as r, open(tmp, "wb") as out:
        while True:
            b = r.read(1 << 16)
            if not b:
                break
            out.write(b)
    os.replace(tmp, f)


def _sessione():
    if "s" not in _SESS:
        import onnxruntime as ort
        o = ort.SessionOptions()
        o.intra_op_num_threads = max(1, min(4, (os.cpu_count() or 2) // 2))
        _SESS["s"] = ort.InferenceSession(str(file_modello()), o, providers=["CPUExecutionProvider"])
    return _SESS["s"]


# --------------------------------------------------------------------------- impronta della voce

_MEL = {}


def _banco_mel(n_fft=512, sr=16000, n_mel=80, f_lo=20.0, f_hi=8000.0):
    """Filtri triangolari sulla scala mel, come Kaldi."""
    k = (n_fft, sr, n_mel)
    if k in _MEL:
        return _MEL[k]

    def mel(f):
        return 1127.0 * np.log(1.0 + f / 700.0)
    m_lo, m_hi = mel(f_lo), mel(f_hi)
    centri = np.linspace(m_lo, m_hi, n_mel + 2)
    freq = np.arange(n_fft // 2 + 1) * sr / n_fft
    fm = mel(freq)
    banco = np.zeros((n_mel, n_fft // 2 + 1), dtype=np.float32)
    for i in range(n_mel):
        a, c, b = centri[i], centri[i + 1], centri[i + 2]
        su = (fm - a) / (c - a)
        giu = (b - fm) / (b - c)
        banco[i] = np.maximum(0, np.minimum(su, giu))
    _MEL[k] = banco
    return banco


def fbank(x):
    """80 bande mel (log), finestre di 25 ms ogni 10 ms, come Kaldi (finestra "povey"), media tolta."""
    x = np.asarray(x, dtype=np.float32) * 32768.0
    if len(x) < 400:
        return np.zeros((0, 80), dtype=np.float32)
    n = 1 + (len(x) - 400) // 160
    idx = np.arange(400)[None, :] + 160 * np.arange(n)[:, None]
    fr = x[idx].astype(np.float64)
    fr -= fr.mean(axis=1, keepdims=True)
    fr[:, 1:] -= 0.97 * fr[:, :-1]
    fr[:, 0] -= 0.97 * fr[:, 0]
    finestra = (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(400) / 399)) ** 0.85
    spettro = np.abs(np.fft.rfft(fr * finestra, n=512)) ** 2
    e = np.log(np.maximum(spettro @ _banco_mel().T.astype(np.float64), 1.1920929e-07))
    # via i pezzi di silenzio (pause, respiri): confonderebbero l'impronta
    energia = np.log10(np.maximum((fr ** 2).sum(axis=1), 1e-3))
    tieni = energia > np.percentile(energia, 95) - 3.0
    if tieni.sum() >= 40:
        e = e[tieni]
    e -= e.mean(axis=0, keepdims=True)
    return e.astype(np.float32)


def impronta(audio):
    f = fbank(audio)
    if len(f) < 40:
        return None
    s = _sessione()
    v = s.run(None, {s.get_inputs()[0].name: f[None, :, :]})[0][0]
    n = np.linalg.norm(v)
    return v / n if n else None


# --------------------------------------------------------------------------- voci della registrazione

IMPRONTE = "voci_impronte.tmp"     # file temporaneo: si cancella a registrazione pronta


def _leggi(cartella):
    """voci.json con, se la registrazione e' ancora in lavorazione, le impronte del file temporaneo."""
    cartella = Path(cartella)
    d = el.leggi_json(cartella / "voci.json", {}) or {"voci": []}
    imp = el.leggi_json(cartella / IMPRONTE, {}) or {}
    for v in d.get("voci") or []:
        c = imp.get(str(v.get("id")))
        if c is not None:
            v["centro"] = c
    return d


def _salva(cartella, d):
    """In voci.json solo id, nome, quante frasi e quanti secondi: le impronte vanno nel file temporaneo."""
    cartella = Path(cartella)
    voci, imp = [], {}
    for v in d.get("voci") or []:
        v = dict(v)
        c = v.pop("centro", None)
        if c is not None:
            imp[str(v.get("id"))] = c
        voci.append(v)
    el.scrivi_json(cartella / "voci.json", {**d, "voci": voci})
    if imp:
        el.scrivi_json(cartella / IMPRONTE, imp)


def dimentica(cartella):
    """Registrazione pronta: cancella ogni impronta della voce (file temporaneo e vecchi voci.json che la
    contenevano). Restano solo i nomi e le etichette «Voce 1», «Docente»..."""
    cartella = Path(cartella)
    try:
        (cartella / IMPRONTE).unlink(missing_ok=True)
    except OSError:
        log.exception("cancello le impronte")
    f = cartella / "voci.json"
    try:
        if f.exists() and '"centro"' in f.read_text(encoding="utf-8"):
            d = el.leggi_json(f, {}) or {}
            for v in d.get("voci") or []:
                v.pop("centro", None)
            el.scrivi_json(f, d)
    except OSError:
        log.exception("tolgo le impronte da voci.json")


def fatta(cartella, k):
    return k in (_leggi(cartella).get("parti") or [])


def _audio_parte(cartella, k, inizio):
    """L'audio della parte k: audio_00k.wav, oppure (registrazione finita, parti gia' tolte) il pezzo giusto
    di audio.m4a / video.mp4. None se non c'e'."""
    wav = cartella / f"audio_{k:03d}.wav"
    if wav.exists() and wav.stat().st_size > 1000:
        return el.audio_16k(wav)
    meta = el.leggi_json(cartella / "meta.json", {}) or {}
    for nome, spost in (("audio.m4a", 0.0),
                        ("video.mp4", float(meta.get("audio_t0") or 0) - float(meta.get("video_t0") or 0))):
        f = cartella / nome
        if not f.exists():
            continue
        if nome == "video.mp4" and not (cartella / "meta.json").exists():
            spost = 0.0         # video importato: l'audio parte insieme al video
        import subprocess
        r = subprocess.run([el.ffmpeg_exe(), "-nostdin", "-loglevel", "error", "-ss", f"{max(0.0, inizio + spost):.3f}",
                            "-t", str(el.parte_secondi(cartella) + 1), "-i", str(f), "-vn",
                            "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
        if r.returncode == 0 and r.stdout:
            return np.frombuffer(r.stdout, dtype=np.float32).copy()
    return None


def rifai(cartella, progresso=lambda f: None):
    """Riconosce le voci di una registrazione gia' finita (es. registrata prima di «Chi parla»)."""
    cartella = Path(cartella)
    parti = sorted(int(f.stem.split("_")[1]) for f in cartella.glob("trascrizione_*.json"))
    _salva(cartella, {"voci": []})
    try:
        (cartella / IMPRONTE).unlink(missing_ok=True)
    except OSError:
        pass
    for i, k in enumerate(parti):
        assegna(cartella, k)
        progresso((i + 1) / max(1, len(parti)))
    n = len(_leggi(cartella).get("voci") or [])
    dimentica(cartella)
    return n


def nomi(cartella, d=None):
    """{id: nome da mostrare}: nome dato a mano, altrimenti «Docente» (lezione, chi parla di piu') o «Voce N»."""
    d = d or _leggi(cartella)
    info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
    import testi
    L = testi.lingua_di(info)
    voci = d.get("voci") or []
    principale = max(voci, key=lambda v: v.get("sec", 0))["id"] if voci else None
    out = {}
    for v in sorted(voci, key=lambda v: v["id"]):
        if v.get("nome"):
            out[v["id"]] = v["nome"]
        elif (info.get("tipo") or "lezione") == "lezione":
            out[v["id"]] = tr("vc_docente" if v["id"] == principale else "vc_domanda", L)
        else:
            out[v["id"]] = tr("vc_voce", L, n=v["id"])
    return out


def assegna(cartella, k):
    """Dà una voce a ogni frase della parte k (trascrizione_00k.json). Ritorna il numero di voci della registrazione."""
    cartella = Path(cartella)
    pj = cartella / f"trascrizione_{k:03d}.json"
    segs = el.leggi_json(pj)
    inizio_parte = (k - 1) * el.parte_secondi(cartella)
    audio = _audio_parte(cartella, k, inizio_parte)
    if not segs or audio is None:
        return 0
    if not modello_presente():
        scarica_modello()
    d = _leggi(cartella)
    voci = d.get("voci") or []
    vecchie = len(voci)
    # quello che si sapeva delle voci dalle parti precedenti
    base_c = [np.asarray(v["centro"], dtype=np.float32) * v.get("n", 1) for v in voci]
    base_n = [v.get("n", 1) for v in voci]

    # 1. impronta di ogni frase abbastanza lunga
    emb, durate, corti = {}, {}, {}
    for i, s in enumerate(segs):
        s.pop("voce", None)
        s.pop("chi", None)
        a, b = s["inizio"] - inizio_parte, s["fine"] - inizio_parte
        if b - a < MIN_CORTA:
            continue
        pezzo = audio[max(0, int(a * 16000)):int(min(b, a + 12) * 16000)]
        try:
            e = impronta(pezzo)
        except Exception:
            log.exception("impronta voce")
            e = None
        if e is not None and b - a < MIN_SEC:
            corti[i] = e
        elif e is not None:
            emb[i], durate[i] = e, b - a

    # 2. prima passata: ogni frase va con la voce piu' simile, o ne apre una nuova
    centri = [c / (np.linalg.norm(c) or 1) for c in base_c]
    somme = [c.copy() for c in base_c]
    lab = {}
    for i, e in emb.items():
        if centri:
            sim = np.array([float(c @ e) for c in centri])
            j = int(sim.argmax())
            if sim[j] >= SOGLIA or len(centri) >= MAX_VOCI:
                lab[i] = j
                somme[j] = somme[j] + e
                centri[j] = somme[j] / (np.linalg.norm(somme[j]) or 1)
                continue
        lab[i] = len(centri)
        centri.append(e.copy())
        somme.append(e.copy())

    # 3. ripasso: con le voci ormai note ogni frase torna alla piu' simile (corregge gli sbagli dell'inizio)
    for _ in range(2):
        for i, e in emb.items():
            sim = np.array([float(c @ e) for c in centri])
            lab[i] = int(sim.argmax())
        somme = [c.copy() if j < vecchie else np.zeros_like(centri[0]) for j, c in enumerate(base_c)] + \
                [np.zeros_like(centri[0]) for _ in range(len(centri) - vecchie)]
        for i, e in emb.items():
            somme[lab[i]] = somme[lab[i]] + e
        centri = [s / n if (n := np.linalg.norm(s)) else c for s, c in zip(somme, centri)]

    # 4. una voce nuova che parla pochissimo (un colpo di tosse, un rumore) non e' una persona:
    #    va con la voce piu' simile. Poi le voci nuove si rinumerano senza buchi.
    sec = {}
    for i, j in lab.items():
        sec[j] = sec.get(j, 0) + durate[i]
    for j in range(vecchie, len(centri)):
        if sec.get(j, 0) < 2.5 and len(centri) > 1:
            altre = [(float(centri[q] @ centri[j]), q) for q in range(len(centri))
                     if q != j and (q < vecchie or sec.get(q, 0) >= 2.5)]
            if altre:
                dove = max(altre)[1]
                for i in lab:
                    if lab[i] == j:
                        lab[i] = dove
                sec[dove] = sec.get(dove, 0) + sec.pop(j, 0)
    usate = sorted({j for j in lab.values() if j >= vecchie})
    nuovo_id = {j: vecchie + n for n, j in enumerate(usate)}
    for j in range(vecchie):
        nuovo_id[j] = j
    conta = {}
    for i, j in lab.items():
        conta[j] = conta.get(j, 0) + 1
    for j in range(vecchie):
        v = voci[j]
        v["n"] = base_n[j] + conta.get(j, 0)
        v["sec"] = round(v.get("sec", 0) + sec.get(j, 0), 1)
    for j in usate:
        voci.append({"id": nuovo_id[j] + 1, "n": conta.get(j, 1), "sec": round(sec.get(j, 0), 1), "nome": ""})
    centri = [centri[j] for j in range(vecchie)] + [centri[j] for j in usate]
    for i, j in lab.items():
        segs[i]["voce"] = nuovo_id[j] + 1
    # le frasi brevi: la voce si riconosce solo se la somiglianza e' netta
    for i, e in corti.items():
        if centri:
            sim = np.array([float(c @ e) for c in centri])
            if sim.max() >= SOGLIA + 0.1:
                segs[i]["voce"] = int(sim.argmax()) + 1

    # le frasi corte prendono la voce della frase prima (o dopo)
    ultima = None
    for s in segs:
        if "voce" in s:
            ultima = s["voce"]
        elif ultima is not None:
            s["voce"] = ultima
    prossima = None
    for s in reversed(segs):
        if "voce" in s:
            prossima = s["voce"]
        elif prossima is not None:
            s["voce"] = prossima
    for v, c in zip(voci, centri):
        v["centro"] = [round(float(x), 5) for x in c]
    d["voci"] = voci
    d["parti"] = sorted(set(d.get("parti") or []) | {k})
    _salva(cartella, d)
    nm = nomi(cartella, d)
    for s in segs:
        if "voce" in s:
            s["chi"] = nm.get(s["voce"], "")
    el.scrivi_json(pj, segs)
    log.info("chi parla, parte %s: %s voci", k, len(voci))
    return len(voci)


def elenco(cartella):
    """Per la pagina «Chi parla»: le voci (con quanto parlano e una frase d'esempio) e la trascrizione."""
    cartella = Path(cartella)
    d = _leggi(cartella)
    nm = nomi(cartella, d)
    tot = sum(v.get("sec", 0) for v in d.get("voci") or []) or 1
    frasi = []
    for f in sorted(cartella.glob("trascrizione_*.json")):
        frasi += el.leggi_json(f, []) or []
    esempi = {}
    for s in frasi:
        if s.get("voce") and s["voce"] not in esempi and len(s.get("testo", "")) > 25:
            esempi[s["voce"]] = {"testo": s["testo"][:160], "sec": s["inizio"]}
    voci = [{"id": v["id"], "nome": v.get("nome", ""), "mostra": nm.get(v["id"], ""), "suggerito": bool(v.get("suggerito")),
             "quota": round(v.get("sec", 0) / tot, 3), "esempio": esempi.get(v["id"])}
            for v in sorted(d.get("voci") or [], key=lambda v: -v.get("sec", 0)) if v.get("sec", 0) > 0]
    righe, prima = [], None
    for s in frasi[:1500]:
        if s.get("voce") != prima or not righe:
            righe.append({"voce": s.get("voce"), "chi": nm.get(s.get("voce"), ""), "sec": s["inizio"],
                          "ora": el.hms(s["inizio"]), "testo": s["testo"]})
            prima = s.get("voce")
        else:
            righe[-1]["testo"] += " " + s["testo"]
    info = el.leggi_json(cartella / "info.json", {}) or {}
    return {"voci": voci, "righe": righe, "partecipanti": info.get("partecipanti") or []}


def rinomina(cartella, nomi_nuovi):
    """nomi_nuovi = {id: "Marco Rossi"}: li scrive in voci.json e in tutte le frasi della trascrizione."""
    cartella = Path(cartella)
    d = _leggi(cartella)
    for v in d.get("voci") or []:
        if str(v["id"]) in nomi_nuovi:
            v["nome"] = str(nomi_nuovi[str(v["id"])] or "").strip()[:60]
            v["suggerito"] = False
    _salva(cartella, d)
    nm = nomi(cartella, d)
    for f in sorted(cartella.glob("trascrizione_*.json")):
        segs = el.leggi_json(f, []) or []
        for s in segs:
            if s.get("voce"):
                s["chi"] = nm.get(s["voce"], "")
        el.scrivi_json(f, segs)
    return nm
