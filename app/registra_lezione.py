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


def perche_no():
    """None se si puo' usare la finestra nuova; "edge" se manca Edge WebView2; "altro" per altri motivi."""
    if os.environ.get("RL_FINESTRA") == "classica":
        return "altro"
    if os.environ.get("RL_FINESTRA") == "senza_edge":
        return "edge"
    try:
        import webview  # noqa: F401
        if sys.platform == "win32":
            from webview.platforms import winforms
            return None if winforms.renderer == "edgechromium" else "edge"
        return None
    except Exception:
        logging.getLogger("registra_lezione").exception("finestra nuova non disponibile")
        return "altro"


def finestra_nuova_possibile():
    """True se si puo' usare la finestra nuova (libreria pywebview + Edge WebView2)."""
    return perche_no() is None


def main():
    _main()
    # finestra chiusa: il programma finisce davvero, anche se qualche libreria ha lasciato
    # un thread acceso (altrimenti resta un processo nascosto che tiene occupati i file)
    if "--prova" not in sys.argv and not os.environ.get("RL_NON_USCIRE"):
        try:
            logging.shutdown()
        except Exception:
            pass
        os._exit(0)


def _main():
    motivo = perche_no()
    if motivo is None:
        import finestra_web
        finestra_web.main()
        return
    if motivo == "edge":
        try:
            import manca_edge
            manca_edge.mostra()
        except Exception:
            logging.getLogger("registra_lezione").exception("avviso Edge")
    import classica
    classica.main()


if __name__ == "__main__":
    main()
