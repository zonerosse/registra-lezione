# -*- coding: utf-8 -*-
"""
Registra Lezione - punto di partenza (lo chiama il lanciatore "Registra Lezione.exe").

Apre la finestra nuova (pagina disegnata con Edge WebView2, come l'anteprima).
Se sul PC manca il componente di Edge, apre la finestra classica (tkinter).
"""
import ctypes
import logging
import os
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

if sys.stdout is None or sys.stderr is None:
    sys.stdout = sys.stderr = open(os.devnull, "w", encoding="utf-8")

if sys.platform == "win32":
    try:
        ctypes.windll.ole32.CoInitializeEx(None, 0x2)       # STA: serve alle finestre di Windows
    except Exception:
        pass
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def al_cestino(percorsi):
    """(usata dalla prova dell'exe)"""
    import motore
    return motore.al_cestino(percorsi)


def finestra_nuova_possibile():
    """True se si puo' usare la finestra nuova (libreria pywebview + Edge WebView2)."""
    if os.environ.get("RL_FINESTRA") == "classica":
        return False
    try:
        import webview  # noqa: F401
        if sys.platform == "win32":
            from webview.platforms import winforms
            return winforms.renderer == "edgechromium"
        return True
    except Exception:
        logging.getLogger("registra_lezione").exception("finestra nuova non disponibile")
        return False


def main():
    if finestra_nuova_possibile():
        import finestra_web
        finestra_web.main()
    else:
        import classica
        classica.main()


if __name__ == "__main__":
    main()
