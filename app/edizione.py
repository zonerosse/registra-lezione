# -*- coding: utf-8 -*-
"""
Quale programma e': «Verba Manent IA» (quello classico) o «Scripta Manent» (pensato per chi ha un DSA).
Il codice e' lo stesso: cambia solo il file «edizione.json» accanto all'exe, che mette l'installazione
di Scripta Manent ({"edizione": "scripta"}). Il file sta FUORI dalla cartella app, cosi' il tasto
Aggiorna (che sostituisce solo app) non lo tocca, e le due edizioni usano lo stesso aggiornamento.
Per le prove: variabile d'ambiente RL_EDIZIONE=scripta.

Scripta Manent ha le sue impostazioni, la sua cartella delle lezioni e la sua cartella nel cloud:
si possono avere tutti e due i programmi sullo stesso PC senza che si mescolino.
"""
import json
import os
import sys
from pathlib import Path

VERBA, SCRIPTA_ID = "verba", "scripta"


def _radice():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def _leggi():
    e = (os.environ.get("RL_EDIZIONE") or "").strip().lower()
    if e in (VERBA, SCRIPTA_ID):
        return e
    try:
        d = json.loads((_radice() / "edizione.json").read_text(encoding="utf-8"))
        if str(d.get("edizione", "")).lower() == SCRIPTA_ID:
            return SCRIPTA_ID
    except Exception:
        pass
    return VERBA


EDIZIONE = _leggi()
SCRIPTA = EDIZIONE == SCRIPTA_ID

NOME = "Scripta Manent" if SCRIPTA else "Verba Manent IA"
NOME_BREVE = "Scripta Manent" if SCRIPTA else "Verba Manent"
CARTELLA_CONFIG = "ScriptaManent" if SCRIPTA else "RegistraLezione"     # in %APPDATA%
CARTELLA_LEZIONI = ("Scripta Manent", "Scripta Manent") if SCRIPTA else ("Lezioni registrate", "Recorded lectures")


def nome_giusto(s):
    """I testi parlano di «Verba Manent IA»: in Scripta Manent diventano «Scripta Manent»."""
    if not SCRIPTA or not isinstance(s, str) or "Verba Manent" not in s:
        return s
    return s.replace("Verba Manent IA", NOME).replace("Verba Manent", NOME)
