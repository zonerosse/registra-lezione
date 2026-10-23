# Scripta Manent per iPhone: la stessa app di Verba Manent IA (cartella verbamanent), nell'edizione «scripta».
import os

os.environ["RL_EDIZIONE"] = "scripta"       # edizione.py: nome, colori, pagine e cartelle di Scripta Manent

from verbamanent.app import main

if __name__ == "__main__":
    main("Scripta Manent", "it.puntowebferrara.scriptamanent").main_loop()
