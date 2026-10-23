# -*- coding: utf-8 -*-
"""
Prova del registratore del programma sul Mac (RegistratoreMac in app/registratore.py), su un Mac vero di GitHub:
la stessa finta lezione di prova_mac.py (voce del Mac + slide che cambiano), ma registrata dal programma,
che deve scrivere gli stessi file di Windows: audio_001.wav, audio_002.wav (parti da 20 s), slide/ e meta.json.
Risultati in prova_mac/reg_esito.txt.
"""
import json
import os
import sys
import threading
import time
import traceback
import wave
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE / "app"))
sys.path.insert(0, str(RADICE / "tools"))
os.environ["RL_PARTE_SECONDI"] = "20"
import prova_mac as pm                     # noqa: E402  voce, slide e finestra a tutto schermo
OUT = pm.OUT
righe = []


def scrivi(s):
    print(s, flush=True)
    righe.append(s)
    (OUT / "reg_esito.txt").write_text("\n".join(righe), encoding="utf-8")


def main():
    import subprocess
    import numpy as np
    import registratore as rg
    scrivi(f"classe: {rg.Registratore.__name__} · rl-cattura: {rg._cattura_exe()} ({rg._cattura_exe().exists()})")
    v, lingua = pm.voce()
    aiff = OUT / "reg_lezione.aiff"
    subprocess.run(["say"] + (["-v", v] if v else []) + ["-o", str(aiff), " ".join(pm.LEZIONE[lingua])], check=True)
    durata = float(subprocess.run(["afinfo", str(aiff)], capture_output=True, text=True).stdout.split("estimated duration:")[1].split()[0])
    immagini = pm.slide(lingua)
    cart = OUT / "reg"
    r = rg.Registratore(cart, "Prova Mac", modo="online", diretta=True)
    parti = []
    r.on_parte = parti.append
    r.avvia()
    r._pronto.wait(30)
    scrivi(f"partito: audio_t0 {r.audio_t0}")
    fine = threading.Event()
    threading.Thread(target=lambda: (time.sleep(2), subprocess.run(["afplay", str(aiff)])), daemon=True).start()
    # pausa di 3 secondi a meta': quel pezzo non deve finire nell'audio
    threading.Timer(durata / 2, r.pausa).start()
    threading.Timer(durata / 2 + 3, r.riprendi).start()
    threading.Timer(durata + 5, fine.set).start()
    try:
        pm.mostra_slide(immagini, (durata + 3) / 3, fine)
    except Exception:
        scrivi("finestra slide: " + traceback.format_exc()[-300:])
        fine.wait()
    tot = r.ferma()
    scrivi(f"fermato: {tot:.1f} s registrati, parti avvisate {parti}, errori {r.errori}")
    ok = True
    wav = sorted(cart.glob("audio_*.wav"))
    sec = 0.0
    for f in wav:
        with wave.open(str(f)) as w:
            n = w.getnframes() / w.getframerate()
            a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32767
        sec += n
        scrivi(f"{f.name}: {n:.1f} s, volume {float(np.sqrt(np.mean(a ** 2))) if len(a) else 0:.4f}")
    if len(wav) < 2 or abs(sec - tot) > 4:
        scrivi(f"NO   parti audio: {len(wav)} file, {sec:.1f} s invece di {tot:.1f}")
        ok = False
    sl = sorted((cart / "slide").glob("*.jpg"))
    meta = json.loads((cart / "meta.json").read_text())
    scrivi(f"slide: {len(sl)} file, in meta {len(meta.get('slides', []))}: {[s['t'] for s in meta.get('slides', [])]}")
    if len(sl) < 2:
        ok = False
    d = r.prendi_diretta()
    scrivi(f"diretta: {'%.1f s' % (len(d[1]) / 48000) if d else 'niente'}")
    scrivi("TUTTO A POSTO" if ok else "QUALCOSA NON VA")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        scrivi("ERRORE " + traceback.format_exc()[-1500:])
    os._exit(0)
