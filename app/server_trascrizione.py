# -*- coding: utf-8 -*-
"""
«Trascrivi sul server»: la trascrizione la fa un server con scheda grafica (RunPod, a consumo) invece del PC
o del telefono. Il server e' quello dell'utente (il suo conto RunPod, il suo «endpoint» con l'immagine
runpod/ai-api-faster-whisper): si paga solo il tempo in cui lavora.

L'audio va al server compresso (Opus o AAC), a pezzi di massimo 10 minuti tagliati in un silenzio, e il server
lo cancella finito il lavoro. Se qualcosa non va (niente internet, chiave sbagliata, server spento) chi chiama
trascrive sul dispositivo: la registrazione non si perde mai.
"""
import base64
import json
import logging
import os
import ssl
import subprocess
import time
import urllib.error
import urllib.request

log = logging.getLogger("registra_lezione")

API = os.environ.get("RL_RUNPOD_API") or "https://api.runpod.ai/v2/"     # (le prove usano un server finto)
MODELLI = ["large-v3", "turbo", "large-v2"]    # il primo che il server conosce (l'immagine 0.4.1 non ha «turbo»)
_MODELLO = {"i": 0}
PEZZO_MAX = 600                 # secondi per richiesta (il server accetta al massimo circa 10 MB)
PREZZO_SECONDO = 0.69 / 3600    # scheda da 24 GB: 0,69 $ l'ora, si paga a millisecondi
ATTESA_MAX = 900                # un pezzo non puo' metterci piu' di 15 minuti (con l'accensione del server)


class ErroreServer(Exception):
    pass


def _chiama(url, chiave, corpo=None, timeout=60):
    dati = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(url, data=dati, method="POST" if dati else "GET",
                                 headers={"Authorization": "Bearer " + chiave, "Content-Type": "application/json",
                                          "User-Agent": "VerbaManentIA"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        from testi import tr
        if e.code in (401, 403):
            raise ErroreServer(tr("srv_chiave"))
        if e.code == 404:
            raise ErroreServer(tr("srv_codice"))
        if e.code == 402:
            raise ErroreServer(tr("srv_credito"))
        raise ErroreServer(tr("srv_err", e=f"HTTP {e.code}"))
    except (urllib.error.URLError, TimeoutError, OSError):
        from testi import tr
        raise ErroreServer(tr("srv_rete"))


def comprimi(audio):
    """Campioni 16 kHz -> Opus in un contenitore Ogg (circa 3 MB l'ora). Sul telefono si cambia (AAC)."""
    import numpy as np
    import elaborazione as el
    r = subprocess.run([el.ffmpeg_exe(), "-nostdin", "-loglevel", "error", "-f", "f32le", "-ar", "16000", "-ac", "1",
                        "-i", "-", "-c:a", "libopus", "-b:a", "32k", "-application", "voip", "-f", "ogg", "-"],
                       input=np.asarray(audio, dtype=np.float32).tobytes(), stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
    if r.returncode != 0 or not r.stdout:
        raise ErroreServer("audio: " + r.stderr.decode("utf-8", "replace")[-300:])
    return r.stdout


def _pezzo(audio, endpoint, chiave, lingua, parole, progresso, precisa=True):
    """Un pezzo (<= 10 minuti): lo manda, aspetta il risultato. Ritorna (segmenti, secondi pagati, lingua)."""
    dati = base64.b64encode(comprimi(audio)).decode("ascii")
    while True:
        try:
            return _lavoro(dati, len(audio), endpoint, chiave, lingua, parole, progresso, precisa, MODELLI[_MODELLO["i"]])
        except ErroreModello:
            if _MODELLO["i"] + 1 >= len(MODELLI):
                raise ErroreServer("modello")
            _MODELLO["i"] += 1
            log.info("il server non ha questo modello: provo %s", MODELLI[_MODELLO["i"]])


class ErroreModello(Exception):
    pass


def _lavoro(dati, n_campioni, endpoint, chiave, lingua, parole, progresso, precisa, modello):
    corpo = {"input": {"audio_base64": dati, "model": modello,
                       "language": None if lingua in (None, "", "auto") else lingua,
                       "initial_prompt": ", ".join(parole) if parole else None,
                       "beam_size": 5 if precisa else 1, "best_of": 5 if precisa else 1,
                       "condition_on_previous_text": False, "enable_vad": True, "transcription": "plain_text"}}
    base = API + endpoint.strip() + "/"
    lavoro = _chiama(base + "run", chiave, corpo)
    jid = lavoro.get("id")
    if not jid:
        raise ErroreServer(str(lavoro)[:200])
    t0 = time.monotonic()
    while True:
        st = _chiama(base + "status/" + jid, chiave)
        stato = st.get("status")
        if stato == "COMPLETED":
            break
        if stato in ("FAILED", "CANCELLED", "TIMED_OUT"):
            err = str(st.get("error") or st.get("output"))
            if "not found" in err.lower() and "model" in err.lower() or "Invalid model" in err:
                raise ErroreModello(err)
            log.warning("server: %s %s", stato, err[:2000])
            from testi import tr
            raise ErroreServer(tr("srv_err", e=stato))
        if time.monotonic() - t0 > ATTESA_MAX:
            try:
                _chiama(base + "cancel/" + jid, chiave, {})
            except ErroreServer:
                pass
            raise ErroreServer("timeout")
        # il server non dice a che punto e' arrivato: avanzo piano verso il 90%
        progresso(min(0.9, (time.monotonic() - t0) / max(20.0, n_campioni / 16000 / 30)))
        time.sleep(1.5)
    out = st.get("output") or {}
    if isinstance(out, dict) and out.get("error"):
        if "Invalid model" in str(out["error"]) or "not found" in str(out["error"]).lower():
            raise ErroreModello(str(out["error"]))
        raise ErroreServer(str(out["error"])[:300])
    segs = [{"inizio": float(s["start"]), "fine": float(s["end"]), "testo": (s.get("text") or "").strip()}
            for s in (out.get("segments") or [])]
    pagati = (float(st.get("delayTime") or 0) + float(st.get("executionTime") or 0)) / 1000
    return segs, pagati, out.get("detected_language")


def trascrivi(audio, endpoint, chiave, lingua="it", parole=None, progresso=lambda f: None, precisa=True):
    """Trascrive dei campioni (16 kHz) sul server. Ritorna (segmenti con gli orari dall'inizio, dollari, lingua)."""
    import elaborazione as el
    tot = len(audio) / 16000
    tagli, da = [], 0.0
    while tot - da > PEZZO_MAX:
        a = el._taglio(audio, da + PEZZO_MAX - 30, da + PEZZO_MAX)
        tagli.append((da, a))
        da = a
    tagli.append((da, tot))
    out, pagati, rilevata = [], 0.0, None
    for i, (a, b) in enumerate(tagli):
        segs, sec, lg = _pezzo(audio[int(a * 16000):int(b * 16000)], endpoint, chiave, lingua, parole,
                               lambda f, i=i: progresso((i + f) / len(tagli)), precisa)
        out += [{"inizio": round(a + s["inizio"], 2), "fine": round(a + s["fine"], 2), "testo": s["testo"]} for s in segs]
        pagati += sec
        rilevata = rilevata or lg
    progresso(1.0)
    return out, round(pagati * PREZZO_SECONDO, 5), rilevata


def prova(endpoint, chiave):
    """«Collega e prova»: 20 secondi di audio di prova. Ritorna i secondi che ci ha messo e quanto e' costato."""
    import numpy as np
    t = np.arange(20 * 16000) / 16000
    audio = (0.05 * np.sin(2 * np.pi * 180 * t) * ((t % 3) < 2)).astype(np.float32)
    t0 = time.monotonic()
    _, dollari, _ = trascrivi(audio, endpoint, chiave, "it", None, precisa=False)
    return {"secondi": round(time.monotonic() - t0), "dollari": dollari}
