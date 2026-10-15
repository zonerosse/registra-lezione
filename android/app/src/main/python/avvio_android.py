# -*- coding: utf-8 -*-
"""
Registra Lezione per Android: avvio.
Il programma (motore, pagine, guida) sta in files/rl (copiato dall'app) oppure in files/rl_agg
(aggiornamento leggero scaricato da «Aggiorna l'app»): uso il piu' nuovo dei due.
Se quello nuovo non parte, torno a quello dell'app.
"""
import json
import shutil
import sys
from pathlib import Path


def _contenuto(c):
    try:
        return int(json.loads((c / "versione_android.json").read_text(encoding="utf-8")).get("contenuto") or 0)
    except Exception:
        return 0


def avvia(cartella_app, lingua_tel="it"):
    base = Path(cartella_app)
    agg = base.parent / "rl_agg"
    scelte = [base]
    if agg.exists():
        if _contenuto(agg) > _contenuto(base):
            scelte.insert(0, agg)
        else:                                   # l'app installata e' piu' nuova dell'aggiornamento leggero
            shutil.rmtree(agg, ignore_errors=True)
    ultimo = None
    for c in scelte:
        sys.path.insert(0, str(c))
        try:
            import android_motore
            return android_motore.avvia(str(c), lingua_tel)
        except Exception as e:
            ultimo = e
            sys.path.remove(str(c))
            for n in [m for m in sys.modules if getattr(sys.modules[m], "__file__", "") and str(c) in str(sys.modules[m].__file__)]:
                del sys.modules[n]
            if c == agg:
                shutil.rmtree(agg, ignore_errors=True)      # aggiornamento leggero difettoso: lo tolgo
    raise ultimo
