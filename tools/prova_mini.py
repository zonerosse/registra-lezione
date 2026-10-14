# -*- coding: utf-8 -*-
"""
Prova vera della mini finestra su Windows (la usa GitHub: workflow "Prova mini finestra").
Apre il programma, avvia una registrazione, controlla che la mini finestra compaia dentro lo
schermo, fa due foto dello schermo (con e senza esclusione dalla registrazione), preme Fine come
dalla mini finestra e controlla che la finestra grande risponda. Risultati in prova_mini/.
"""
import ctypes
import json
import os
import sys
import threading
import time
import traceback
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
OUT = RADICE / "prova_mini"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(RADICE / "app"))
os.environ["RL_NON_USCIRE"] = "1"
os.environ.setdefault("RL_PARTE_SECONDI", "20")
righe = []


def scrivi(s):
    print(s, flush=True)
    righe.append(s)
    (OUT / "esito.txt").write_text("\n".join(righe), encoding="utf-8")


def foto(nome):
    import mss
    import mss.tools
    with mss.mss() as s:
        img = s.grab(s.monitors[1])
        mss.tools.to_png(img.rgb, img.size, output=str(OUT / nome))


def main():
    ctypes.windll.ole32.CoInitializeEx(None, 0x2)
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
    import registra_lezione as rl
    scrivi(f"finestra nuova possibile: {rl.finestra_nuova_possibile()}")
    import webview
    import finestra_web as fw
    api = fw.Api()
    win = webview.create_window("Registra Lezione", url=str(fw.PAGINE / "index.html"), js_api=api,
                                width=1060, height=730, background_color="#061e36")
    api._win = win
    u32 = ctypes.windll.user32

    def rett(hwnd):
        r = ctypes.wintypes.RECT()
        u32.GetWindowRect(hwnd, ctypes.byref(r))
        return r.left, r.top, r.right, r.bottom

    def prova():
        import ctypes.wintypes  # noqa: F401
        try:
            api._carica()
            t0 = time.time()
            while not api.pronto().get("pronto") and time.time() - t0 < 60:
                time.sleep(0.5)
            win.events.loaded.wait(30)
            time.sleep(3)
            foto("1-finestra.png")
            r = api.avvia("Prova mini finestra")
            scrivi(f"avvia: {r}")
            t0 = time.time()
            while api._mini is None and time.time() - t0 < 10:
                time.sleep(0.2)
            mini = api._mini
            scrivi(f"mini creata: {mini is not None}")
            ok = mini.events.shown.wait(15) if mini else False
            scrivi(f"mini mostrata: {ok}")
            time.sleep(4)
            hwnd = int(mini.native.Handle.ToInt64())
            sw, sh = u32.GetSystemMetrics(0), u32.GetSystemMetrics(1)
            l, t, r_, b = rett(hwnd)
            dentro = l >= 0 and t >= 0 and r_ <= sw and b <= sh
            scrivi(f"schermo {sw}x{sh}; mini da ({l},{t}) a ({r_},{b}); visibile={bool(u32.IsWindowVisible(hwnd))}; "
                   f"dentro lo schermo={dentro}")
            scrivi(f"finestra grande ridotta a icona: {bool(u32.IsIconic(int(win.native.Handle.ToInt64())))}")
            foto("2-mini-esclusa-dalla-registrazione.png")
            u32.SetWindowDisplayAffinity(hwnd, 0)
            time.sleep(1)
            foto("3-mini-visibile.png")
            u32.SetWindowDisplayAffinity(hwnd, 0x11)
            # Fine dalla mini finestra (come il pulsante)
            t0 = time.time()
            api.fine()
            scrivi(f"fine: risposta in {time.time() - t0:.2f} s")
            time.sleep(2)
            t0 = time.time()
            v = win.evaluate_js("1 + 1")
            scrivi(f"finestra grande risponde dopo Fine: {v == 2} ({time.time() - t0:.2f} s)")
            scrivi(f"mini chiusa: {not u32.IsWindow(hwnd)}")
            scrivi(f"finestra grande riaperta: {not u32.IsIconic(int(win.native.Handle.ToInt64()))}")
            time.sleep(3)
            foto("4-dopo-fine.png")
            for _ in range(60):
                st = api.stato()
                if not st.get("occupato"):
                    break
                time.sleep(1)
            scrivi(f"stato finale: vista={st.get('vista')} occupato={st.get('occupato')}")
            scrivi("FINE PROVA")
        except Exception:
            scrivi("ERRORE\n" + traceback.format_exc())
        finally:
            api._esci = True
            try:
                win.destroy()
            except Exception:
                pass

    webview.start(lambda: threading.Thread(target=prova, daemon=True).start(), private_mode=True)


if __name__ == "__main__":
    main()
    os._exit(0)
