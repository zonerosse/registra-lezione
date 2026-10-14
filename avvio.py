# -*- coding: utf-8 -*-
"""
Lanciatore di Registra Lezione (diventa "Registra Lezione.exe").

Le librerie stanno dentro l'exe; il codice del programma sta nella cartella "app"
accanto all'exe, cosi' il tasto Aggiorna puo' sostituire solo quella (pochi KB).
Se c'e' una versione nuova scaricata (cartella "app_nuova"), qui prende il posto della vecchia.
"""
import importlib
import os
import shutil
import sys
import traceback
from pathlib import Path

import dipendenze  # noqa: F401  (serve a mettere tutte le librerie dentro l'exe)

if getattr(sys, "frozen", False):
    RADICE = Path(sys.executable).resolve().parent
else:
    RADICE = Path(__file__).resolve().parent
os.chdir(RADICE)

if sys.stdout is None or sys.stderr is None:
    sys.stdout = sys.stderr = open(os.devnull, "w", encoding="utf-8")

APP, NUOVA, VECCHIA = RADICE / "app", RADICE / "app_nuova", RADICE / "app_vecchia"


def metti_aggiornamento():
    if not (NUOVA / "registra_lezione.py").exists():
        return
    try:
        shutil.rmtree(VECCHIA, ignore_errors=True)
        if APP.exists():
            APP.rename(VECCHIA)
        NUOVA.rename(APP)
    except Exception:
        # qualcosa non va: rimetto la versione di prima
        if not APP.exists() and VECCHIA.exists():
            VECCHIA.rename(APP)


def errore(testo):
    try:
        import tkinter as tk
        from tkinter import messagebox
        r = tk.Tk()
        r.withdraw()
        messagebox.showerror("Registra Lezione", testo)
        r.destroy()
    except Exception:
        pass


def main():
    metti_aggiornamento()
    if not (APP / "registra_lezione.py").exists():
        errore("Manca la cartella \"app\" accanto al programma.\n"
               "Riscarica il pacchetto completo di Registra Lezione.")
        return
    sys.path.insert(0, str(APP))
    if "--prova" in sys.argv:
        prova = importlib.import_module("prova_exe")
        sys.exit(prova.main(RADICE))
    try:
        programma = importlib.import_module("registra_lezione")
        programma.main()
    except Exception:
        dettagli = traceback.format_exc()
        try:
            (RADICE / "errore_avvio.txt").write_text(dettagli, encoding="utf-8")
        except Exception:
            pass
        # se la versione nuova non parte, torno a quella di prima al prossimo avvio
        if VECCHIA.exists() and (VECCHIA / "registra_lezione.py").exists():
            try:
                difettosa = RADICE / "app_difettosa"
                shutil.rmtree(difettosa, ignore_errors=True)
                APP.rename(difettosa)
                VECCHIA.rename(APP)
            except Exception:
                pass
            errore("La versione nuova non è partita: ho rimesso quella di prima.\n"
                   "Riapri il programma.")
        else:
            errore("Il programma non è partito.\nDettagli nel file errore_avvio.txt")


if __name__ == "__main__":
    main()
