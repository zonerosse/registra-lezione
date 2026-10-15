# -*- coding: utf-8 -*-
"""
Finestrella che compare solo se sul PC manca Microsoft Edge WebView2 (serve alla grafica nuova).
Porta al download ufficiale di Microsoft; intanto il programma si apre con la finestra classica.
"""
import json
import os
import webbrowser
from pathlib import Path

LINK = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"      # Evergreen Bootstrapper di Microsoft
CONFIG = Path(os.environ.get("APPDATA") or Path.home() / ".config") / "RegistraLezione" / "config.json"

TESTI = {
    "it": {"tit": "Manca un componente di Windows",
           "testo": "Per la sua grafica Verba Manent IA usa Microsoft Edge WebView2, gratuito. "
                    "Su questo PC non c'è (di solito è già presente in Windows 10 e 11).",
           "passi": "1. Tocca «Scarica da Microsoft»\n2. Apri il file scaricato e conferma (ci vuole un minuto)\n3. Riapri Verba Manent IA",
           "scarica": "⬇  Scarica da Microsoft", "dopo": "Si scarica MicrosoftEdgeWebview2Setup.exe dal sito di Microsoft: aprilo, poi riapri il programma.",
           "continua": "Per ora continua con la finestra semplice", "mai": "Non chiederlo più"},
    "en": {"tit": "A Windows component is missing",
           "testo": "For its graphics Verba Manent IA uses Microsoft Edge WebView2, which is free. "
                    "It is not on this PC (it is usually already part of Windows 10 and 11).",
           "passi": "1. Tap «Download from Microsoft»\n2. Open the downloaded file and confirm (it takes a minute)\n3. Open Verba Manent IA again",
           "scarica": "⬇  Download from Microsoft", "dopo": "MicrosoftEdgeWebview2Setup.exe is downloaded from the Microsoft website: open it, then open the program again.",
           "continua": "Continue with the simple window for now", "mai": "Don't ask again"},
}


def _cfg():
    try:
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    except Exception:
        return {}


def mostra():
    """Mostra la finestrella (se l'utente non ha detto 'Non chiederlo piu'')."""
    c = _cfg()
    if c.get("non_chiedere_edge"):
        return
    import testi
    lingua = c.get("lingua") if c.get("lingua") in TESTI else testi.lingua_windows()
    T = TESTI[lingua]
    import tkinter as tk
    NAVY, BLU, INK, MUT, SOFT = "#0d4275", "#0369a1", "#1f2937", "#64748b", "#f1f6fb"
    r = tk.Tk()
    r.title("Verba Manent IA")
    r.configure(bg="white")
    r.resizable(False, False)
    try:
        r.iconbitmap(default=str(Path(__file__).resolve().parent / "icona.ico"))
    except Exception:
        pass
    ban = tk.Frame(r, bg=NAVY, padx=22, pady=16)
    ban.pack(fill="x")
    try:
        from PIL import Image, ImageTk
        im = Image.open(Path(__file__).resolve().parent / "icona.ico")
        im.size = (48, 48)
        r._logo = ImageTk.PhotoImage(im.convert("RGBA").resize((44, 44)))
        tk.Label(ban, image=r._logo, bg=NAVY).pack(side="left", padx=(0, 12))
    except Exception:
        pass
    t = tk.Frame(ban, bg=NAVY)
    t.pack(side="left")
    tk.Label(t, text="Verba Manent IA", bg=NAVY, fg="white", font=("Segoe UI", 14, "bold")).pack(anchor="w")
    tk.Label(t, text="by Punto Web Ferrara", bg=NAVY, fg="#a9cbe8", font=("Segoe UI", 9)).pack(anchor="w")
    ct = tk.Frame(r, bg="white", padx=22, pady=16)
    ct.pack(fill="both")
    tk.Label(ct, text=T["tit"], bg="white", fg="#0f1b2d", font=("Segoe UI", 12, "bold")).pack(anchor="w")
    tk.Label(ct, text=T["testo"], bg="white", fg=INK, font=("Segoe UI", 10), wraplength=440,
             justify="left").pack(anchor="w", pady=(6, 0))
    tk.Label(ct, text=T["passi"], bg=SOFT, fg=INK, font=("Segoe UI", 10), justify="left", anchor="w",
             padx=12, pady=8).pack(fill="x", pady=(12, 0))
    esito = tk.Label(ct, text="", bg="white", fg="#047857", font=("Segoe UI", 9), wraplength=440, justify="left")
    mai = tk.BooleanVar(value=False)

    def scarica():
        try:
            webbrowser.open(LINK)
        except Exception:
            pass
        esito.config(text=T["dopo"])

    def continua():
        if mai.get():
            c2 = _cfg()
            c2["non_chiedere_edge"] = True
            try:
                CONFIG.parent.mkdir(parents=True, exist_ok=True)
                CONFIG.write_text(json.dumps(c2, ensure_ascii=False, indent=1), encoding="utf-8")
            except Exception:
                pass
        r.destroy()

    b1 = tk.Label(ct, text=T["scarica"], bg=BLU, fg="white", font=("Segoe UI", 11, "bold"), pady=10, cursor="hand2")
    b1.pack(fill="x", pady=(14, 0))
    b1.bind("<Button-1>", lambda e: scarica())
    b1.bind("<Enter>", lambda e: b1.config(bg=NAVY))
    b1.bind("<Leave>", lambda e: b1.config(bg=BLU))
    esito.pack(anchor="w", pady=(8, 0))
    b2 = tk.Label(ct, text=T["continua"], bg="white", fg=NAVY, font=("Segoe UI", 10), pady=7, cursor="hand2",
                  highlightthickness=1, highlightbackground="#cfe0f1")
    b2.pack(fill="x", pady=(6, 0))
    b2.bind("<Button-1>", lambda e: continua())
    tk.Checkbutton(ct, text=T["mai"], variable=mai, bg="white", fg=MUT, font=("Segoe UI", 9),
                   activebackground="white").pack(anchor="w", pady=(10, 0))
    r.protocol("WM_DELETE_WINDOW", continua)
    r.update_idletasks()
    x = (r.winfo_screenwidth() - r.winfo_reqwidth()) // 2
    y = (r.winfo_screenheight() - r.winfo_reqheight()) // 3
    r.geometry(f"+{x}+{y}")
    r.mainloop()
