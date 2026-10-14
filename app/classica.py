# -*- coding: utf-8 -*-
"""
Registra Lezione - la finestra classica (tkinter).
Si usa solo se sul PC manca il componente di Edge (WebView2) per la finestra nuova.
"""
import ctypes
import datetime
import json
import logging
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
import traceback
import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

# avviato senza finestra nera: stdout/stderr non esistono
if sys.stdout is None or sys.stderr is None:
    sys.stdout = sys.stderr = open(os.devnull, "w", encoding="utf-8")

APP = "Registra Lezione"


if sys.platform == "win32":
    # La finestra deve usare COM in modalita' "STA", quella che serve alle finestre di Windows
    # (es. "Scegli cartella"). Va fatto prima di caricare la libreria audio.
    try:
        ctypes.windll.ole32.CoInitializeEx(None, 0x2)
    except Exception:
        pass

import motore as mt                  # noqa: E402
from motore import (BASE, CONFIG, cartella_documenti, leggi_config, salva_config,  # noqa: E402,F401
                    gb_testo, al_cestino, mostra_file, log, agg, ap, el, rg)


# ----------------------------------------------------------------------------- colori (come l'anteprima)
BG, WIN, INK, MUTED = "#e9edf2", "#ffffff", "#1d2430", "#6b7686"
LINE, RED, RED_D, GREEN, BLUE, SOFT = "#dde2e9", "#d93636", "#b52a2a", "#1f9d55", "#2563eb", "#f6f8fb"
DARK, DARK_D, GREEN_D, BLUE_D = "#333333", "#1f1f1f", "#18804a", "#1d4fc4"
VIOLA, VIOLA_SOFT, GRIGIO_SW = "#7c3aed", "#f3edff", "#c7ced8"
PAUSA, PAUSA_D, AMBRA = "#b45309", "#92400e", "#b45309"     # arancio scuro: scritta bianca leggibile
RIPRENDI, RIPRENDI_D = "#18804a", "#136b3d"
FONT = "Segoe UI"


def apri(percorso):
    if not mt.apri(percorso):
        messagebox.showerror(APP, f"Non riesco ad aprire:\n{percorso}")


def menu_tasto_destro(root):
    """Menu del tasto destro (Taglia, Copia, Incolla, Seleziona tutto) in tutti i campi di testo."""
    menu = tk.Menu(root, tearoff=0)
    stato = {"w": None}

    def fai(evento):
        w = stato["w"]
        if w is not None:
            w.focus_set()
            w.event_generate(evento)

    def seleziona_tutto():
        w = stato["w"]
        if w is not None:
            w.focus_set()
            w.select_range(0, "end")
            w.icursor("end")

    menu.add_command(label="Taglia", command=lambda: fai("<<Cut>>"))
    menu.add_command(label="Copia", command=lambda: fai("<<Copy>>"))
    menu.add_command(label="Incolla", command=lambda: fai("<<Paste>>"))
    menu.add_separator()
    menu.add_command(label="Seleziona tutto", command=seleziona_tutto)

    def apri_menu(e):
        stato["w"] = e.widget
        nascosto = str(e.widget.cget("show") or "") != ""
        # da un campo nascosto (la chiave) non si taglia ne' copia
        menu.entryconfigure("Taglia", state="disabled" if nascosto else "normal")
        menu.entryconfigure("Copia", state="disabled" if nascosto else "normal")
        try:
            menu.tk_popup(e.x_root, e.y_root)
        finally:
            menu.grab_release()

    root.bind_class("Entry", "<Button-3>", apri_menu)
    return menu


class Bottone(tk.Label):
    """Bottone piatto e colorato come nell'anteprima."""

    def __init__(self, master, testo, colore, colore_hover, comando, grande=True):
        super().__init__(master, text=testo, bg=colore, fg="white", cursor="hand2",
                         font=(FONT, 14 if grande else 10, "bold" if grande else "normal"),
                         pady=14 if grande else 6, padx=12)
        self.c, self.ch, self.cmd = colore, colore_hover, comando
        self.bind("<Enter>", lambda e: self.config(bg=self.ch))
        self.bind("<Leave>", lambda e: self.config(bg=self.c))
        self.bind("<Button-1>", lambda e: self.cmd())

    def colori(self, testo, colore, colore_hover):
        self.c, self.ch = colore, colore_hover
        self.config(text=testo, bg=colore)


class BottoneMini(tk.Label):
    def __init__(self, master, testo, comando, bg=WIN):
        super().__init__(master, text=testo, bg=bg, fg=INK, cursor="hand2", font=(FONT, 10),
                         padx=12, pady=5, highlightthickness=1, highlightbackground=LINE)
        self.attivo = True
        self.bgn = bg
        self.bind("<Button-1>", lambda e: comando() if self.attivo else None)
        self.bind("<Enter>", lambda e: self.config(bg=SOFT) if self.attivo else None)
        self.bind("<Leave>", lambda e: self.config(bg=self.bgn))

    def abilita(self, si):
        self.attivo = si
        self.config(fg=INK if si else "#a3abb7", cursor="hand2" if si else "arrow")


def chip(master, testo, ok=False, bg=SOFT):
    f = tk.Frame(master, bg=bg, highlightthickness=1, highlightbackground=LINE)
    if ok:
        tk.Label(f, text="✓", bg=bg, fg=GREEN, font=(FONT, 10, "bold")).pack(side="left", padx=(8, 0))
    tk.Label(f, text=testo, bg=bg, fg=MUTED, font=(FONT, 10)).pack(side="left", padx=(4, 8), pady=3)
    return f


class PannelloParti(tk.Frame):
    """Elenco 'Pacchetti per Claude' con lo stato di ogni parte."""

    def __init__(self, master, riprova=None):
        super().__init__(master, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=8)
        self.riprova = riprova
        tk.Label(self, text="Pacchetti per Claude", bg=SOFT, fg=INK,
                 font=(FONT, 10, "bold")).pack(anchor="w")
        self.righe = tk.Frame(self, bg=SOFT)
        self.righe.pack(fill="x")

    def disegna(self, parti):
        for w in self.righe.winfo_children():
            w.destroy()
        if not parti:
            tk.Label(self.righe, text="Nessuna parte registrata.", bg=SOFT, fg=MUTED,
                     font=(FONT, 9)).pack(anchor="w", pady=4)
        for k in sorted(parti):
            p = parti[k]
            r = tk.Frame(self.righe, bg=SOFT)
            r.pack(fill="x", pady=(6, 0))
            sx = tk.Frame(r, bg=SOFT)
            sx.pack(side="left")
            tk.Label(sx, text=f"Parte {k}", bg=SOFT, fg=INK, font=(FONT, 10)).pack(anchor="w")
            tk.Label(sx, text=p.get("orario", ""), bg=SOFT, fg=MUTED, font=(FONT, 8)).pack(anchor="w")
            dx = tk.Frame(r, bg=SOFT)
            dx.pack(side="right")
            st = p["stato"]
            if st == "reg":
                tk.Label(dx, text="● in registrazione", bg=SOFT, fg=MUTED, font=(FONT, 9)).pack()
            elif st == "attesa":
                tk.Label(dx, text="in coda…", bg=SOFT, fg=MUTED, font=(FONT, 9)).pack()
            elif st == "lav":
                tk.Label(dx, text=f"Scrivo il testo… {p.get('perc', 0) * 100:.0f}%", bg=SOFT, fg=MUTED,
                         font=(FONT, 9)).pack(anchor="e")
                c = tk.Canvas(dx, width=160, height=6, bg=LINE, highlightthickness=0)
                c.pack(anchor="e", pady=(3, 0))
                c.create_rectangle(0, 0, 160 * p.get("perc", 0), 6, fill=BLUE, width=0)
            elif st == "ok":
                tk.Label(dx, text="✓ pronta", bg=SOFT, fg=GREEN, font=(FONT, 9, "bold")).pack(side="left", padx=(0, 8))
                BottoneMini(dx, "Mostra file", lambda f=p.get("file"): mostra_file(f), bg=WIN).pack(side="left")
            else:
                tk.Label(dx, text="⚠ problema", bg=SOFT, fg=RED, font=(FONT, 9, "bold")).pack()
            self._riga_appunti(k, p)
            tk.Frame(self.righe, bg=LINE, height=1).pack(fill="x", pady=(6, 0))

    def _riga_appunti(self, k, p):
        st = p.get("ap")
        if not st:
            return
        r = tk.Frame(self.righe, bg=VIOLA_SOFT, padx=8, pady=5)
        r.pack(fill="x", pady=(6, 0))
        if st == "attesa":
            tk.Label(r, text="Appunti di Claude: in coda…", bg=VIOLA_SOFT, fg=MUTED, font=(FONT, 9)).pack(side="left")
        elif st == "lav":
            # Claude non dice a che punto e': stimo sul tempo (di solito 1-3 minuti)
            f = min(0.95, (time.monotonic() - p.get("ap_t0", time.monotonic())) / 120)
            tk.Label(r, text="Claude scrive gli appunti…", bg=VIOLA_SOFT, fg=MUTED, font=(FONT, 9)).pack(side="left")
            c = tk.Canvas(r, width=150, height=6, bg=LINE, highlightthickness=0)
            c.pack(side="right")
            c.create_rectangle(0, 0, 150 * f, 6, fill=VIOLA, width=0)
        elif st == "ok":
            tk.Label(r, text="✓ Appunti pronti", bg=VIOLA_SOFT, fg=GREEN, font=(FONT, 9, "bold")).pack(side="left")
            BottoneMini(r, "Apri appunti", lambda f=p.get("ap_file"): apri(f), bg=WIN).pack(side="right")
        else:
            tk.Label(r, text="⚠ Appunti non creati: " + p.get("ap_err", ""), bg=VIOLA_SOFT, fg=RED,
                     font=(FONT, 9), wraplength=360, justify="left").pack(side="left")
            if self.riprova:
                BottoneMini(r, "Riprova", lambda: self.riprova(k), bg=WIN).pack(side="right")


class MiniFinestra(tk.Toplevel):
    """Finestrella sempre in primo piano durante la registrazione: si trascina dove si vuole."""

    def __init__(self, app):
        super().__init__(app.root)
        self.app = app
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        try:
            self.attributes("-alpha", 0.96)
        except tk.TclError:
            pass
        self.configure(bg=LINE)
        f = tk.Frame(self, bg=WIN, padx=10, pady=8)
        f.pack(fill="both", expand=True, padx=1, pady=1)
        t = tk.Frame(f, bg=WIN)
        t.pack(fill="x")
        self.rec = tk.Label(t, text="● REC", bg=WIN, fg=RED, font=(FONT, 9, "bold"))
        self.rec.pack(side="left")
        self.nome = tk.Label(t, text="", bg=WIN, fg=INK, font=(FONT, 9, "bold"))
        self.nome.pack(side="left", padx=(6, 0))
        tk.Label(t, text="⠿", bg=WIN, fg=MUTED, font=(FONT, 10)).pack(side="right")
        tk.Frame(f, bg=LINE, height=1).pack(fill="x", pady=(6, 6))
        g = tk.Frame(f, bg=WIN)
        g.pack(fill="x")
        self.valori = {}
        for i, (k, et) in enumerate((("tempo", "durata"), ("slide", "slide"), ("gb", "registrati"))):
            g.columnconfigure(i, weight=1, uniform="m")
            c = tk.Frame(g, bg=WIN)
            c.grid(row=0, column=i, sticky="ew")
            v = tk.Label(c, text="–", bg=WIN, fg=INK, font=(FONT, 12, "bold"))
            v.pack()
            tk.Label(c, text=et, bg=WIN, fg=MUTED, font=(FONT, 8)).pack()
            self.valori[k] = v
        tk.Label(f, text="Audio", bg=WIN, fg=MUTED, font=(FONT, 8)).pack(anchor="w", pady=(6, 0))
        self.meter = tk.Canvas(f, width=250, height=5, bg=LINE, highlightthickness=0)
        self.meter.pack(fill="x")
        self.bar = self.meter.create_rectangle(0, 0, 0, 5, fill=GREEN, width=0)
        self.parti = tk.Label(f, text="", bg=WIN, fg=MUTED, font=(FONT, 8), justify="left", anchor="w")
        self.parti.pack(fill="x", pady=(6, 0))
        self.avviso = tk.Label(f, text="", bg=WIN, fg=RED, font=(FONT, 8, "bold"), justify="left",
                               anchor="w", wraplength=250)
        self.avviso.pack(fill="x")
        b = tk.Frame(f, bg=WIN)
        b.pack(fill="x", pady=(8, 0))
        b.columnconfigure(0, weight=1, uniform="b")
        b.columnconfigure(1, weight=1, uniform="b")
        self.btn_pausa = Bottone(b, "⏸ Pausa", PAUSA, PAUSA_D, app.pausa_o_riprendi, grande=False)
        self.btn_pausa.grid(row=0, column=0, sticky="ew", padx=(0, 3))
        Bottone(b, "■ Fine lezione", DARK, DARK_D, app.fine_da_mini, grande=False).grid(
            row=0, column=1, sticky="ew", padx=(3, 0))
        BottoneMini(b, "Apri finestra", app.apri_finestra).grid(row=1, column=0, columnspan=2,
                                                                 sticky="ew", pady=(6, 0))
        # trascinamento
        self._da = None
        for w in [self, f, t, self.rec, self.nome, g] + list(g.winfo_children()):
            w.bind("<ButtonPress-1>", self._inizio)
            w.bind("<B1-Motion>", self._muovi)
        # niente altezza fissa: la finestrella si allunga da sola se il testo delle parti cresce
        self.parti.config(text="Parte 1: ● in registrazione\nParte 2: ● in registrazione")
        self.update_idletasks()
        x = self.winfo_screenwidth() - self.winfo_reqwidth() - 24
        y = self.winfo_screenheight() - self.winfo_reqheight() - 90
        self.geometry(f"+{x}+{y}")

    def _inizio(self, e):
        self._da = (e.x_root - self.winfo_x(), e.y_root - self.winfo_y())

    def _muovi(self, e):
        if self._da:
            self.geometry(f"+{e.x_root - self._da[0]}+{e.y_root - self._da[1]}")

    def aggiorna(self, nome, secondi, n_slide, gb, livello, parti, avviso, pausa=None):
        self.nome.config(text=nome if len(nome) <= 26 else nome[:25] + "…")
        if pausa is not None:
            self.rec.config(text="⏸ PAUSA", fg=AMBRA)
            m, s = divmod(int(pausa), 60)
            parti = f"In pausa da {m:02d}:{s:02d}: non registro niente"
        else:
            self.rec.config(text="● REC", fg=RED if int(secondi * 2) % 2 == 0 else WIN)
        self.valori["tempo"].config(text=time.strftime("%H:%M:%S", time.gmtime(secondi)))
        self.valori["slide"].config(text=str(n_slide))
        self.valori["gb"].config(text=f"{gb:.1f} GB".replace(".", ","))
        self.meter.coords(self.bar, 0, 0, self.meter.winfo_width() * livello, 5)
        self.parti.config(text=parti)
        self.avviso.config(text=avviso)


class App:
    def __init__(self, root):
        self.root = root
        self.cfg = leggi_config()
        self.reg = None
        self.occupato = False          # registrazione o preparazione in corso
        self.coda = queue.Queue()      # messaggi dai thread alla finestra
        self.lavori = queue.Queue()    # trascrizioni da fare, una alla volta
        self.cartella_corrente = None
        self.silenzio_da = time.monotonic()
        self.parti = {}
        self.finale = None             # None | (0..1) | "ok"
        self.agg_trovato = None
        self.accodate = set()          # parti gia' messe in coda
        self.lavori_appunti = queue.Queue()
        self.appunti_lezione = False   # appunti attivi per la lezione in corso

        root.title(APP)
        root.configure(bg=BG)
        # dimensioni in proporzione al ridimensionamento di Windows (100%, 125%, 150%...)
        scala = max(1.0, root.winfo_fpixels("1i") / 96.0)
        alt = int(min(root.winfo_screenheight() - 90, 820 * scala))
        root.geometry(f"{int(660 * scala)}x{alt}+40+20")
        root.minsize(int(540 * scala), int(480 * scala))
        root.protocol("WM_DELETE_WINDOW", self.chiudi)
        root.report_callback_exception = self.errore_tk
        self.menu_testo = menu_tasto_destro(root)
        if sys.platform == "win32":
            try:
                root.iconbitmap(default=str(QUI / "icona.ico"))
            except Exception:
                pass

        win = tk.Frame(root, bg=WIN, highlightthickness=1, highlightbackground="#c9d0da")
        win.pack(fill="both", expand=True, padx=16, pady=16)

        # schede
        tabs = tk.Frame(win, bg=WIN)
        tabs.pack(fill="x")
        self.tab_btn = {}
        for chiave, testo in (("reg", "Registra"), ("arch", "Le mie lezioni"), ("imp", "⚙ Impostazioni")):
            col = tk.Frame(tabs, bg=WIN)
            col.pack(side="left", fill="x", expand=True)
            lb = tk.Label(col, text=testo, bg=WIN, fg=MUTED, font=(FONT, 11), pady=10, cursor="hand2")
            lb.pack(fill="x")
            ln = tk.Frame(col, bg=WIN, height=3)
            ln.pack(fill="x")
            lb.bind("<Button-1>", lambda e, k=chiave: self.scheda(k))
            self.tab_btn[chiave] = (lb, ln)
        tk.Frame(win, bg=LINE, height=1).pack(fill="x")

        # piede: versione + Aggiorna
        self.piede = tk.Frame(win, bg=WIN)
        self.piede.pack(side="bottom", fill="x")
        tk.Frame(self.piede, bg=LINE, height=1).pack(fill="x")
        riga = tk.Frame(self.piede, bg=WIN, padx=22, pady=8)
        riga.pack(fill="x")
        v = agg.versione_locale().get("versione", "?")
        tk.Label(riga, text=f"Versione {v}", bg=WIN, fg=MUTED, font=(FONT, 9)).pack(side="left")
        self.lbl_modello = tk.Label(riga, text="", bg=WIN, fg=MUTED, font=(FONT, 9))
        self.lbl_modello.pack(side="left", padx=(12, 0))
        BottoneMini(riga, "↻ Aggiorna", self.cerca_aggiornamenti).pack(side="right")
        self.box_agg = tk.Frame(win, bg=WIN, highlightthickness=1, highlightbackground=LINE, padx=14, pady=10)

        self.p_reg = tk.Frame(win, bg=WIN, padx=22, pady=18)
        self.p_arch = tk.Frame(win, bg=WIN, padx=22, pady=10)
        self.p_imp = tk.Frame(win, bg=WIN)
        self.canvas_imp = tk.Canvas(self.p_imp, bg=WIN, highlightthickness=0)
        sb_imp = tk.Scrollbar(self.p_imp, orient="vertical", command=self.canvas_imp.yview)
        self.p_imp_dentro = tk.Frame(self.canvas_imp, bg=WIN, padx=22, pady=16)
        self.p_imp_dentro.bind("<Configure>", lambda e: self.canvas_imp.configure(
            scrollregion=self.canvas_imp.bbox("all")))
        self._win_imp = self.canvas_imp.create_window((0, 0), window=self.p_imp_dentro, anchor="nw")
        self.canvas_imp.bind("<Configure>", lambda e: self.canvas_imp.itemconfig(self._win_imp, width=e.width))
        self.canvas_imp.configure(yscrollcommand=sb_imp.set)
        self.canvas_imp.pack(side="left", fill="both", expand=True)
        sb_imp.pack(side="right", fill="y")
        self.costruisci_registra()
        self.costruisci_impostazioni()
        self.costruisci_archivio()
        self.aggiorna_riepilogo()
        self.scheda("reg")
        self.mostra("pronto")

        threading.Thread(target=self.lavoratore, daemon=True).start()
        threading.Thread(target=self.lavoratore_appunti, daemon=True).start()
        threading.Thread(target=self.prepara_modello, daemon=True).start()
        self.root.after(200, self.ciclo)

    # ------------------------------------------------------------------ schede

    def scheda(self, k):
        self.tab_corrente = k
        for chiave, (lb, ln) in self.tab_btn.items():
            on = chiave == k
            lb.config(fg=INK if on else MUTED, font=(FONT, 11, "bold" if on else "normal"))
            ln.config(bg=BLUE if on else WIN)
        for pg in (self.p_reg, self.p_arch, self.p_imp):
            pg.pack_forget()
        if k == "reg":
            self.aggiorna_riepilogo()
            self.p_reg.pack(fill="both", expand=True)
        elif k == "imp":
            self.p_imp.pack(fill="both", expand=True)
        else:
            self.aggiorna_archivio()
            self.p_arch.pack(fill="both", expand=True)

    def mostra(self, stato):
        for f in self.stati.values():
            f.pack_forget()
        self.stati[stato].pack(fill="both", expand=True)
        self.stato = stato

    # ------------------------------------------------------------------ scheda Registra

    def costruisci_registra(self):
        self.stati = {}
        P = self.p_reg

        # --- pronto
        f = tk.Frame(P, bg=WIN)
        self.stati["pronto"] = f
        tk.Label(f, text="Che lezione registri?", bg=WIN, fg=INK, font=(FONT, 11, "bold")).pack(anchor="w")
        self.nome = tk.Entry(f, font=(FONT, 12), relief="flat", highlightthickness=1,
                             highlightbackground=LINE, highlightcolor=BLUE)
        self.nome.pack(fill="x", ipady=6, pady=(4, 0))
        self.nome.bind("<KeyRelease>", lambda e: self.aggiorna_nome_anteprima())
        self.lbl_nome_ant = tk.Label(f, text="", bg=WIN, fg=MUTED, font=(FONT, 9), anchor="w")
        self.lbl_nome_ant.pack(fill="x", pady=(4, 0))
        self.riga_recenti = tk.Frame(f, bg=WIN)
        self.riga_recenti.pack(fill="x", pady=(2, 0))
        self.aggiorna_nome_anteprima()
        self.disegna_recenti()

        # riepilogo delle impostazioni (si cambiano nella scheda Impostazioni)
        self.riepilogo = tk.Frame(f, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=10)
        self.riepilogo.pack(fill="x", pady=(16, 0))
        Bottone(f, "●  Inizia lezione", RED, RED_D, self.inizia).pack(fill="x", pady=(18, 0))
        tk.Label(f, text="Prima di iniziare: entra nella lezione su Meet e tieni la finestra di Meet "
                         "sullo schermo principale. Il volume del PC deve essere acceso. "
                         "Appena inizi, questa finestra si riduce e resta la mini finestra di controllo.",
                 bg=WIN, fg=MUTED, font=(FONT, 9), wraplength=540, justify="left").pack(anchor="w", pady=(12, 0))

        # --- registrazione in corso
        f = tk.Frame(P, bg=WIN)
        self.stati["reg"] = f
        r = tk.Frame(f, bg=WIN)
        r.pack(anchor="w")
        self.pallino = tk.Label(r, text="●", bg=WIN, fg=RED, font=(FONT, 12))
        self.pallino.pack(side="left")
        self.lbl_stato_rec = tk.Label(r, text=" Sto registrando: ", bg=WIN, fg=INK, font=(FONT, 11, "bold"))
        self.lbl_stato_rec.pack(side="left")
        self.lbl_nome_rec = tk.Label(r, text="", bg=WIN, fg=INK, font=(FONT, 11))
        self.lbl_nome_rec.pack(side="left")
        boxes = tk.Frame(f, bg=WIN)
        boxes.pack(fill="x", pady=(14, 0))
        for i in range(3):
            boxes.columnconfigure(i, weight=1, uniform="b")
        self.lbl_tempo = self._box(boxes, 0, "00:00:00", "Durata")
        self.lbl_slide = self._box(boxes, 1, "0", "Slide catturate")
        b = tk.Frame(boxes, bg=SOFT, highlightthickness=1, highlightbackground=LINE)
        b.grid(row=0, column=2, sticky="nsew", padx=4)
        tk.Label(b, text="♫", bg=SOFT, fg=INK, font=(FONT, 16)).pack(pady=(10, 0))
        tk.Label(b, text="Audio", bg=SOFT, fg=MUTED, font=(FONT, 9)).pack()
        self.meter = tk.Canvas(b, height=8, bg=LINE, highlightthickness=0)
        self.meter.pack(fill="x", padx=12, pady=(6, 12))
        self.meter_bar = self.meter.create_rectangle(0, 0, 0, 8, fill=GREEN, width=0)
        self.pann_reg = PannelloParti(f, self.riprova_appunti)
        self.pann_reg.pack(fill="x", pady=(14, 0))
        r = tk.Frame(f, bg=WIN)
        r.pack(fill="x", pady=(12, 0))
        chip(r, "Puoi ridurre questa finestra: continua a registrare.").pack(side="left")
        self.avviso_audio = tk.Label(f, text="", bg=WIN, fg=RED, font=(FONT, 10, "bold"),
                                     wraplength=540, justify="left")
        self.avviso_audio.pack(anchor="w", pady=(6, 0))
        self.btn_pausa = Bottone(f, "⏸  Pausa (intervallo)", PAUSA, PAUSA_D, self.pausa_o_riprendi)
        self.btn_pausa.pack(fill="x", pady=(8, 0))
        Bottone(f, "■  Fine lezione", DARK, DARK_D, self.fine).pack(fill="x", pady=(8, 0))

        # --- lezione finita
        f = tk.Frame(P, bg=WIN)
        self.stati["fine"] = f
        r = tk.Frame(f, bg=WIN)
        r.pack(anchor="w")
        tk.Label(r, text="✓", bg=WIN, fg=GREEN, font=(FONT, 13, "bold")).pack(side="left")
        self.lbl_fine = tk.Label(r, text=" Lezione finita", bg=WIN, fg=INK, font=(FONT, 12, "bold"))
        self.lbl_fine.pack(side="left")
        self.pann_fine = PannelloParti(f, self.riprova_appunti)
        self.lbl_spesa = tk.Label(f, text="", bg=WIN, fg=MUTED, font=(FONT, 9), anchor="w")
        self.lbl_spesa.pack(fill="x", pady=(6, 0))
        self.pann_fine.pack(fill="x", pady=(14, 0))
        self.avviso_fine = tk.Label(f, text="", bg=WIN, fg=RED, font=(FONT, 10),
                                    wraplength=540, justify="left")
        self.avviso_fine.pack(anchor="w", pady=(6, 0))
        self.btn_appunti = Bottone(f, "📄  Apri gli appunti", GREEN, GREEN_D, self.apri_appunti_correnti)
        self.btn_appunti.pack(fill="x", pady=(8, 0))
        BottoneMini(f, "Apri la cartella dei pacchetti", lambda: apri(self.cfg["cartella_pacchetti"])).pack(
            fill="x", pady=(10, 0))
        self.btn_completa = BottoneMini(f, "", lambda: self.apri_lezione(self.cartella_corrente))
        self.btn_completa.pack(fill="x", pady=(12, 0))
        self.btn_nuova = BottoneMini(f, "Registra un'altra lezione", self.nuova)
        self.btn_nuova.pack(fill="x", pady=(8, 0))

    # ------------------------------------------------------------------ scheda Impostazioni

    def costruisci_impostazioni(self):
        f = self.p_imp_dentro

        box = tk.Frame(f, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=10)
        box.pack(fill="x")
        tk.Label(box, text="I tuoi dati", bg=SOFT, fg=INK, font=(FONT, 10, "bold")).pack(anchor="w")
        g = tk.Frame(box, bg=SOFT)
        g.pack(fill="x", pady=(6, 0))
        g.columnconfigure(0, weight=1, uniform="d")
        g.columnconfigure(1, weight=1, uniform="d")
        self.campi_dati = {}
        for n, (chiave, etichetta) in enumerate((("nome", "Nome e cognome"), ("universita", "Università"),
                                                  ("corso", "Corso di laurea"), ("anno", "Anno"))):
            c = tk.Frame(g, bg=SOFT)
            c.grid(row=n // 2, column=n % 2, sticky="ew", padx=(0 if n % 2 == 0 else 6, 0 if n % 2 else 6), pady=3)
            tk.Label(c, text=etichetta, bg=SOFT, fg=MUTED, font=(FONT, 9)).pack(anchor="w")
            e = tk.Entry(c, font=(FONT, 10), relief="flat", highlightthickness=1,
                         highlightbackground=LINE, highlightcolor=BLUE)
            e.pack(fill="x", ipady=4)
            e.insert(0, (self.cfg.get("studente") or {}).get(chiave, ""))
            e.bind("<KeyRelease>", lambda ev: self.salva_dati())
            e.bind("<FocusOut>", lambda ev: self.salva_dati())
            self.campi_dati[chiave] = e
        tk.Label(box, text="Compaiono in testa ai PDF e servono a Claude per scrivere appunti adatti al tuo corso.",
                 bg=SOFT, fg=MUTED, font=(FONT, 8)).pack(anchor="w", pady=(6, 0))
        box = tk.Frame(f, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=10)
        box.pack(fill="x", pady=(10, 0))
        tk.Label(box, text="Dove salvo i pacchetti per Claude", bg=SOFT, fg=INK,
                 font=(FONT, 10, "bold")).pack(anchor="w")
        r = tk.Frame(box, bg=SOFT)
        r.pack(fill="x", pady=(6, 0))
        self.lbl_cartella = tk.Label(r, text=self.cfg["cartella_pacchetti"], bg=WIN, fg=INK,
                                     font=(FONT, 9), anchor="w", padx=8, pady=6,
                                     highlightthickness=1, highlightbackground=LINE)
        self.lbl_cartella.pack(side="left", fill="x", expand=True)
        BottoneMini(r, "Scegli…", self.scegli_cartella).pack(side="left", padx=(8, 0))
        tk.Label(box, text="Ogni quanto preparo un pacchetto per Claude", bg=SOFT, fg=INK,
                 font=(FONT, 10, "bold")).pack(anchor="w", pady=(12, 0))
        self.riga_durata = tk.Frame(box, bg=SOFT)
        self.riga_durata.pack(anchor="w", pady=(6, 0))
        self.disegna_durata()
        tk.Label(box, text="Con 30 minuti gli appunti arrivano prima; il costo totale è quasi lo stesso.",
                 bg=SOFT, fg=MUTED, font=(FONT, 8)).pack(anchor="w", pady=(4, 0))

        box = tk.Frame(f, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=10)
        box.pack(fill="x", pady=(12, 0))
        tk.Label(box, text="Appunti automatici con Claude", bg=SOFT, fg=INK,
                 font=(FONT, 10, "bold")).pack(anchor="w")
        r = tk.Frame(box, bg=SOFT)
        r.pack(fill="x", pady=(6, 0))
        self.lbl_chiave = tk.Label(r, text="", bg=SOFT, fg=MUTED, font=(FONT, 9))
        self.lbl_chiave.pack(side="left")
        self.btn_chiave = BottoneMini(r, "", self.finestra_chiave)
        self.btn_chiave.pack(side="right")
        r = tk.Frame(box, bg=SOFT, cursor="hand2")
        r.pack(fill="x", pady=(8, 0))
        self.sw = tk.Canvas(r, width=40, height=22, bg=SOFT, highlightthickness=0, cursor="hand2")
        self.sw.pack(side="left")
        lb = tk.Label(r, text="Per ogni pacchetto, crea da solo gli appunti di studio (PDF, formato Cornell)", bg=SOFT, fg=INK,
                      font=(FONT, 10), cursor="hand2")
        lb.pack(side="left", padx=(8, 0))
        for w in (self.sw, lb):
            w.bind("<Button-1>", lambda e: self.cambia_appunti())
        tk.Label(box, text="Costo stimato: circa 0,20 $ per ogni ora di lezione registrata.", bg=SOFT, fg=MUTED,
                 font=(FONT, 8)).pack(anchor="w", pady=(6, 0))
        self.disegna_appunti()


        box = tk.Frame(f, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=10)
        box.pack(fill="x", pady=(10, 0))
        tk.Label(box, text="Durante la registrazione", bg=SOFT, fg=INK, font=(FONT, 10, "bold")).pack(anchor="w")
        r = tk.Frame(box, bg=SOFT, cursor="hand2")
        r.pack(fill="x", pady=(6, 0))
        self.sw_mini = tk.Canvas(r, width=40, height=22, bg=SOFT, highlightthickness=0, cursor="hand2")
        self.sw_mini.pack(side="left")
        lb = tk.Label(r, text="Mostra la mini finestra sopra le altre", bg=SOFT,
                      fg=INK, font=(FONT, 10), cursor="hand2")
        lb.pack(side="left", padx=(8, 0))
        for w in (self.sw_mini, lb):
            w.bind("<Button-1>", lambda e: self.cambia_mini())
        r = tk.Frame(box, bg=SOFT, cursor="hand2")
        r.pack(fill="x", pady=(8, 0))
        self.sw_dnd = tk.Canvas(r, width=40, height=22, bg=SOFT, highlightthickness=0, cursor="hand2")
        self.sw_dnd.pack(side="left")
        lb = tk.Label(r, text="Prima di iniziare ricordami il \"Non disturbare\" di Windows", bg=SOFT,
                      fg=INK, font=(FONT, 10), cursor="hand2")
        lb.pack(side="left", padx=(8, 0))
        for w in (self.sw_dnd, lb):
            w.bind("<Button-1>", lambda e: self.cambia_dnd())

        box = tk.Frame(f, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=10)
        box.pack(fill="x", pady=(10, 0))
        tk.Label(box, text="Controlli", bg=SOFT, fg=INK, font=(FONT, 10, "bold")).pack(anchor="w")
        self.riga_controlli = tk.Frame(box, bg=SOFT)
        self.riga_controlli.pack(fill="x", pady=(6, 0))
        self.disegna_interruttore(self.sw_mini, self.cfg.get("mini_finestra", True))
        self.disegna_interruttore(self.sw_dnd, self.cfg.get("promemoria_dnd", True))

    def disegna_durata(self):
        for w in self.riga_durata.winfo_children():
            w.destroy()
        scelto = int(self.cfg.get("parte_minuti", 30))
        for minuti, testo in ((30, "30 minuti"), (60, "1 ora")):
            on = minuti == scelto
            lb = tk.Label(self.riga_durata, text=testo, bg=BLUE if on else WIN, fg="white" if on else INK,
                          font=(FONT, 10, "bold" if on else "normal"), padx=14, pady=5, cursor="hand2",
                          highlightthickness=1, highlightbackground=BLUE if on else LINE)
            lb.pack(side="left")
            lb.bind("<Button-1>", lambda e, m=minuti: self.scegli_durata(m))

    def scegli_durata(self, minuti):
        self.cfg["parte_minuti"] = minuti
        salva_config(self.cfg)
        self.disegna_durata()
        self.aggiorna_riepilogo()

    def salva_dati(self):
        nuovi = {k: e.get().strip() for k, e in self.campi_dati.items()}
        if nuovi != (self.cfg.get("studente") or {}):
            self.cfg["studente"] = nuovi
            salva_config(self.cfg)

    def cambia_dnd(self):
        self.cfg["promemoria_dnd"] = not self.cfg.get("promemoria_dnd", True)
        salva_config(self.cfg)
        self.disegna_interruttore(self.sw_dnd, self.cfg["promemoria_dnd"])

    def cambia_mini(self):
        self.cfg["mini_finestra"] = not self.cfg.get("mini_finestra", True)
        salva_config(self.cfg)
        self.disegna_interruttore(self.sw_mini, self.cfg["mini_finestra"])

    @staticmethod
    def disegna_interruttore(c, on):
        c.delete("all")
        col = GREEN if on else GRIGIO_SW
        c.create_oval(0, 0, 22, 22, fill=col, outline=col)
        c.create_oval(18, 0, 40, 22, fill=col, outline=col)
        c.create_rectangle(11, 0, 29, 22, fill=col, outline=col)
        x = 21 if on else 3
        c.create_oval(x, 3, x + 16, 19, fill="white", outline="white")

    def aggiorna_riepilogo(self):
        f = self.riepilogo
        for w in f.winfo_children():
            w.destroy()
        cart = Path(self.cfg["cartella_pacchetti"])
        try:
            corta = str(cart.relative_to(cartella_documenti().parent))
        except ValueError:
            corta = str(cart)
        ha_chiave = bool(self.chiave())
        app_on = bool(self.cfg.get("appunti_attivi")) and ha_chiave
        aud = getattr(self, "_audio_ok", None)
        lib = getattr(self, "_liberi", None)
        m = int(self.cfg.get("parte_minuti", 30))
        righe = [
            (True, f"Pacchetti in: {corta} · uno ogni {'ora' if m == 60 else f'{m} minuti'}"),
            (app_on, "Appunti automatici con Claude (formato Cornell): " + ("accesi" if app_on else
                                                           ("spenti" if ha_chiave else "spenti (manca la chiave)"))),
        ]
        if aud is not None:
            righe.append((aud, "Audio del PC" if aud else "Audio del PC: non trovato!"))
        if lib is not None:
            righe.append((lib > 5, f"Spazio libero: {lib:.0f} GB"))
        for ok, testo in righe:
            r = tk.Frame(f, bg=SOFT)
            r.pack(anchor="w")
            tk.Label(r, text="✓" if ok else "✕", bg=SOFT, fg=GREEN if ok else RED,
                     font=(FONT, 10, "bold"), width=2).pack(side="left")
            tk.Label(r, text=testo, bg=SOFT, fg=INK, font=(FONT, 10)).pack(side="left")
        lk = tk.Label(f, text="Per cambiare: ⚙ Impostazioni", bg=SOFT, fg=BLUE, font=(FONT, 9, "underline"),
                      cursor="hand2")
        lk.pack(anchor="w", pady=(4, 0))
        lk.bind("<Button-1>", lambda e: self.scheda("imp"))

    def aggiorna_nome_anteprima(self):
        n = self.nome.get().strip() or "Lezione"
        self.lbl_nome_ant.config(text=f"Data e ora le aggiunge il programma: {n} · "
                                      f"{datetime.datetime.now():%d/%m/%Y} ore {datetime.datetime.now():%H:%M}")

    @staticmethod
    def materia_di(nome):
        return nome.split(" – ")[0].split(" - ")[0].strip()

    def ricorda_materia(self, nome):
        m = self.materia_di(nome)
        if not m or m == "Lezione":
            return
        rec = [x for x in (self.cfg.get("materie_recenti") or []) if x != m]
        self.cfg["materie_recenti"] = ([m] + rec)[:5]
        salva_config(self.cfg)

    def disegna_recenti(self):
        for w in self.riga_recenti.winfo_children():
            w.destroy()
        rec = self.cfg.get("materie_recenti") or []
        if not rec:
            return
        tk.Label(self.riga_recenti, text="Ultime usate:", bg=WIN, fg=MUTED, font=(FONT, 9)).pack(side="left")
        for m in rec:
            BottoneMini(self.riga_recenti, m, lambda m=m: self.usa_materia(m)).pack(side="left", padx=(6, 0))

    def usa_materia(self, m):
        self.nome.delete(0, "end")
        self.nome.insert(0, m + " – ")
        self.nome.focus_set()
        self.nome.icursor("end")
        self.aggiorna_nome_anteprima()

    def _box(self, master, col, valore, etichetta):
        b = tk.Frame(master, bg=SOFT, highlightthickness=1, highlightbackground=LINE)
        b.grid(row=0, column=col, sticky="nsew", padx=4)
        v = tk.Label(b, text=valore, bg=SOFT, fg=INK, font=(FONT, 16, "bold"))
        v.pack(pady=(10, 0))
        tk.Label(b, text=etichetta, bg=SOFT, fg=MUTED, font=(FONT, 9)).pack(pady=(0, 12))
        return v

    def scegli_cartella(self):
        c = filedialog.askdirectory(title="Dove salvo i pacchetti per Claude?",
                                    initialdir=self.cfg["cartella_pacchetti"]
                                    if Path(self.cfg["cartella_pacchetti"]).exists() else str(Path.home()))
        if c:
            self.cfg["cartella_pacchetti"] = str(Path(c))
            salva_config(self.cfg)
            self.lbl_cartella.config(text=self.cfg["cartella_pacchetti"])
            self.aggiorna_riepilogo()

    def aggiorna_controlli(self):
        for w in self.riga_controlli.winfo_children():
            w.destroy()
        audio_ok = rg.controlla_audio()
        liberi = shutil.disk_usage(BASE).free / 1e9
        chip(self.riga_controlli, "Audio del PC" if audio_ok else "Audio: non trovato!", audio_ok).pack(side="left", padx=(0, 8))
        chip(self.riga_controlli, "Schermo", True).pack(side="left", padx=(0, 8))
        chip(self.riga_controlli, f"Spazio libero: {liberi:.0f} GB", liberi > 5).pack(side="left")
        self._audio_ok, self._liberi = audio_ok, liberi
        self.aggiorna_riepilogo()
        return audio_ok, liberi

    # ------------------------------------------------------------------ parti

    @staticmethod
    def _hhmm(sec):
        sec = int(round(sec))
        return f"{sec // 3600:02d}:{sec % 3600 // 60:02d}"

    def _orario(self, k, fine=None):
        ps = getattr(self, "parte_sec", 3600)
        a = (k - 1) * ps
        b = fine if fine is not None else k * ps
        return f"{self._hhmm(a)} – {self._hhmm(b)}"

    def accoda_parte(self, cart, k):
        if (str(cart), k) not in self.accodate:
            self.accodate.add((str(cart), k))
            self.lavori.put(("parte", cart, k))

    def ridisegna_parti(self):
        self.pann_reg.disegna(self.parti)
        self.pann_fine.disegna(self.parti)
        ha_appunti = any(p.get("ap") == "ok" for p in self.parti.values())
        self.btn_appunti.config(text="📄  Apri gli appunti (formato Cornell)" if ha_appunti
                                else "Gli appunti non ci sono ancora")
        if self.finale == "ok":
            self.btn_completa.config(text="Trascrizione completa (slide + testo, per controllare)")
            self.btn_completa.abilita(True)
            self.btn_nuova.abilita(True)
        else:
            perc = f" {self.finale * 100:.0f}%" if isinstance(self.finale, float) else ""
            self.btn_completa.config(text=f"La lezione completa è in preparazione…{perc}")
            self.btn_completa.abilita(False)
            self.btn_nuova.abilita(False)

    # ------------------------------------------------------------------ azioni

    def inizia(self):
        if self.occupato:
            return
        audio_ok, liberi = self.aggiorna_controlli()
        if not audio_ok and not messagebox.askyesno(
                APP, "Non trovo l'audio del PC da registrare.\n\n"
                     "Controlla che casse o cuffie siano collegate.\n\nVuoi registrare lo stesso (solo schermo)?"):
            return
        if liberi < 3 and not messagebox.askyesno(
                APP, f"C'è poco spazio libero sul disco ({liberi:.1f} GB).\nUna lezione di 2 ore occupa circa 1-2 GB.\n\nContinuo?"):
            return
        try:
            Path(self.cfg["cartella_pacchetti"]).mkdir(parents=True, exist_ok=True)
        except OSError:
            messagebox.showerror(APP, "Non riesco a usare la cartella dei pacchetti.\nTocca \"Scegli…\" e scegline un'altra.")
            return
        if self.cfg.get("promemoria_dnd", True):
            self.promemoria_non_disturbare(self._avvia)
        else:
            self._avvia()

    def promemoria_non_disturbare(self, poi):
        """Prima di registrare: invito ad attivare 'Non disturbare' (i suoni delle notifiche
        altrimenti finiscono nella registrazione). Windows non permette di attivarlo da un programma."""
        d = tk.Toplevel(self.root)
        d.title("Prima di iniziare")
        d.configure(bg=WIN, padx=20, pady=18)
        d.transient(self.root)
        d.resizable(False, False)
        tk.Label(d, text="🔕  Prima di iniziare: \"Non disturbare\"", bg=WIN, fg=INK,
                 font=(FONT, 12, "bold")).pack(anchor="w")
        tk.Label(d, text="Così i suoni delle notifiche (mail, WhatsApp, Windows) non finiscono "
                         "nella registrazione.", bg=WIN, fg=INK, font=(FONT, 10), wraplength=400,
                 justify="left").pack(anchor="w", pady=(8, 0))
        passi = tk.Frame(d, bg=SOFT, highlightthickness=1, highlightbackground=LINE, padx=12, pady=8)
        passi.pack(fill="x", pady=(10, 0))
        for t in ("1. Tocca \"Apri Non disturbare\"",
                  "2. Nella finestra di Windows accendi l'interruttore \"Non disturbare\"",
                  "3. Torna qui e tocca \"Fatto, inizia\""):
            tk.Label(passi, text=t, bg=SOFT, fg=INK, font=(FONT, 9), anchor="w").pack(fill="x")
        piu = tk.BooleanVar(value=False)

        def chiudi_e(azione):
            if piu.get():
                self.cfg["promemoria_dnd"] = False
                salva_config(self.cfg)
                self.disegna_interruttore(self.sw_dnd, False)
            d.destroy()
            if azione:
                azione()

        def apri_dnd():
            try:
                if sys.platform == "win32":
                    os.startfile("ms-settings:notifications")
            except Exception:
                log.exception("apertura impostazioni notifiche")
        r = tk.Frame(d, bg=WIN)
        r.pack(fill="x", pady=(14, 0))
        r.columnconfigure(0, weight=1, uniform="p")
        r.columnconfigure(1, weight=1, uniform="p")
        Bottone(r, "Apri Non disturbare", BLUE, BLUE_D, apri_dnd, grande=False).grid(
            row=0, column=0, sticky="ew", padx=(0, 4))
        Bottone(r, "Fatto, inizia", RED, RED_D, lambda: chiudi_e(poi), grande=False).grid(
            row=0, column=1, sticky="ew", padx=(4, 0))
        BottoneMini(d, "Inizia lo stesso", lambda: chiudi_e(poi)).pack(fill="x", pady=(8, 0))
        tk.Checkbutton(d, text="Non mostrarlo più (si riattiva in ⚙ Impostazioni)", variable=piu,
                       bg=WIN, fg=MUTED, font=(FONT, 9), activebackground=WIN).pack(anchor="w", pady=(10, 0))
        d.protocol("WM_DELETE_WINDOW", lambda: chiudi_e(None))
        d.grab_set()

    def _avvia(self):
        if self.occupato:
            return
        nome = self.nome.get().strip() or "Lezione"
        self.ricorda_materia(nome)
        cart = BASE / f"{datetime.datetime.now():%Y-%m-%d %H%M} - {el.nome_sicuro(nome)}"
        cart.mkdir(parents=True, exist_ok=True)
        self.parte_sec = int(os.environ.get("RL_PARTE_SECONDI") or int(self.cfg.get("parte_minuti", 30)) * 60)
        el.scrivi_json(cart / "info.json", {"nome": nome, "inizio": datetime.datetime.now().isoformat(timespec="seconds"),
                                            "durata": 0, "n_slide": 0, "stato": "registrazione", "pacchetti": {},
                                            "studente": self.cfg.get("studente") or {},
                                            "parte_secondi": self.parte_sec})
        self.cartella_corrente = cart
        self.appunti_lezione = bool(self.cfg.get("appunti_attivi") and self.chiave())
        self.lbl_spesa.config(text="")
        self.parti = {1: {"stato": "reg", "orario": self._orario(1)}}
        self.finale = None
        self.reg = rg.Registratore(cart, nome, self.parte_sec)
        self.btn_pausa.colori("⏸  Pausa (intervallo)", PAUSA, PAUSA_D)
        self.reg.on_parte = lambda k: self.coda.put(("parte_finita", k))
        self.reg.avvia()
        self.occupato = True
        rg.tieni_sveglio(True)
        self.silenzio_da = time.monotonic()
        self.avviso_audio.config(text="")
        self.avviso_fine.config(text="")
        self.lbl_nome_rec.config(text=nome)
        self.ridisegna_parti()
        self.mostra("reg")
        log.info("inizio registrazione: %s", cart)
        self._gb, self._gb_t = 0.0, 0
        if self.cfg.get("mini_finestra", True):
            self.mini = MiniFinestra(self)
            self.root.after(400, self.root.iconify)

    def fine(self):
        # il comando puo' arrivare due volte (mini finestra + finestra grande): uno solo vale
        if not self.reg or getattr(self, "_chiedo_fine", False):
            return
        self._chiedo_fine = True
        try:
            si = messagebox.askyesno(APP, "Fermo la registrazione?")
        finally:
            self._chiedo_fine = False
        if not si or not self.reg:
            return
        reg, self.reg = self.reg, None
        self.chiudi_mini()
        self.root.deiconify()
        for k, p in self.parti.items():
            if p["stato"] == "reg":
                p["stato"] = "attesa"
        self.finale = 0.0
        self.lbl_fine.config(text=" Lezione finita")
        self.ridisegna_parti()
        self.mostra("fine")

        def ferma():
            try:
                durata = reg.ferma()
                el.aggiorna_info(reg.cartella, durata=round(durata), stato="elaborazione")
                self.coda.put(("registrazione_ferma", (reg.cartella, reg.parte, durata, list(reg.errori))))
            except Exception:
                log.exception("fine")
                self.coda.put(("errore", traceback.format_exc()))
        threading.Thread(target=ferma, daemon=True).start()

    def appunti_mancanti(self, cartella):
        """Per una lezione gia' pronta: chiede a Claude gli appunti delle parti che non li hanno."""
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        pac, fatti = info.get("pacchetti") or {}, info.get("appunti") or {}
        self.cartella_corrente = cart
        self.parti = {}
        for k in sorted(pac, key=int):
            p = {"stato": "ok", "file": pac[k], "orario": ""}
            if k in fatti and Path(fatti[k]).exists():
                p.update(ap="ok", ap_file=fatti[k])
            self.parti[int(k)] = p
        for k, p in self.parti.items():
            if not p.get("ap"):
                self.accoda_appunti(cart, k)
        self.finale = "ok"
        self.lbl_fine.config(text=f" {info.get('nome', 'Lezione')}")
        self.avviso_fine.config(text="")
        self.aggiorna_spesa()
        self.ridisegna_parti()
        self.scheda("reg")
        self.mostra("fine")

    def rifai_appunti(self, cartella):
        """Rifà pacchetti e appunti di una lezione già pronta: formato Cornell, lavagne unite,
        slide ritagliate. Richiama Claude, quindi costa qualche centesimo."""
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        pac = info.get("pacchetti") or {}
        if not pac:
            return
        minuti = max(1, round((info.get("durata") or 0) / 60))
        stima = max(0.01, 0.2 * minuti / 60)
        if not messagebox.askyesno(APP, f"Rifaccio gli appunti di «{info.get('nome', '')}»?\n\n"
                                        "Saranno nel formato Cornell, con le lavagne unite e le slide "
                                        "ritagliate.\nGli appunti di prima vengono sostituiti.\n\n"
                                        f"Costo stimato: circa {stima:.2f} $".replace(".", ",")):
            return
        for k in pac:
            vecchio = (info.get("appunti") or {}).get(k)
            for f in (cart / f"appunti_{int(k):03d}.json", Path(vecchio) if vecchio else None):
                if f and f.exists():
                    try:
                        f.unlink()
                    except OSError:
                        pass
        tutti = info.get("appunti_completi")
        if tutti and Path(tutti).exists() and len(pac) > 1:
            try:
                Path(tutti).unlink()
            except OSError:
                pass
        el.aggiorna_info(cart, appunti={}, appunti_completi=None)
        self.cartella_corrente = cart
        self.parti = {int(k): {"stato": "lav", "perc": 0.0, "orario": ""} for k in pac}
        self.appunti_lezione = True          # quando il pacchetto e' rifatto, partono gli appunti
        self.finale = "ok"
        self.lbl_fine.config(text=f" {info.get('nome', 'Lezione')}")
        self.avviso_fine.config(text="")
        self.aggiorna_spesa()
        self.ridisegna_parti()
        self.scheda("reg")
        self.mostra("fine")

        def lavoro():
            for k in sorted(pac, key=int):
                try:
                    zp = el.crea_pacchetto(cart, int(k), self.cfg["cartella_pacchetti"])
                    self.coda.put(("parte_ok", (int(k), str(zp))))
                except Exception:
                    log.exception("rifai pacchetto %s", k)
                    self.coda.put(("parte_err", int(k)))
        threading.Thread(target=lavoro, daemon=True).start()

    def completa(self, cartella):
        """Finisce una lezione rimasta a meta' (es. PC spento mentre preparava i file)."""
        if self.occupato:
            messagebox.showinfo(APP, "Aspetta che finisca il lavoro in corso.")
            return
        cart = Path(cartella)
        info = el.leggi_json(cart / "info.json", {}) or {}
        fatti = info.get("pacchetti") or {}
        parti = el.file_parti(cart)
        self.cartella_corrente = cart
        self.parte_sec = el.parte_secondi(cart)
        self.appunti_lezione = bool(self.cfg.get("appunti_attivi") and self.chiave())
        fatti_ap = info.get("appunti") or {}
        self.parti = {}
        for k, wav in parti.items():
            fine_k = (k - 1) * el.parte_secondi(cart) + el.durata_wav(wav)
            if str(k) in fatti and Path(fatti[str(k)]).exists():
                self.parti[k] = {"stato": "ok", "file": fatti[str(k)], "orario": self._orario(k, fine_k)}
                if str(k) in fatti_ap and Path(fatti_ap[str(k)]).exists():
                    self.parti[k].update(ap="ok", ap_file=fatti_ap[str(k)])
                elif self.appunti_lezione:
                    self.accoda_appunti(cart, k)
            else:
                self.parti[k] = {"stato": "attesa", "orario": self._orario(k, fine_k)}
                self.accoda_parte(cart, k)
        if not info.get("durata"):
            meta = el.leggi_json(cart / "meta.json", {}) or {}
            d = meta.get("durata") or sum(el.durata_wav(p) for p in parti.values())
            el.aggiorna_info(cart, durata=round(d or 0))
        self.lavori.put(("finale", cart))
        self.occupato = True
        rg.tieni_sveglio(True)
        self.finale = 0.0
        self.aggiorna_spesa()
        self.lbl_fine.config(text=f" {info.get('nome', 'Lezione')}")
        self.avviso_fine.config(text="")
        self.ridisegna_parti()
        self.scheda("reg")
        self.mostra("fine")

    def pausa_o_riprendi(self):
        if not self.reg:
            return
        if self.reg.in_pausa:
            self.reg.riprendi()
            self.btn_pausa.colori("⏸  Pausa (intervallo)", PAUSA, PAUSA_D)
            if getattr(self, "mini", None) is not None:
                self.mini.btn_pausa.colori("⏸ Pausa", PAUSA, PAUSA_D)
        else:
            self.reg.pausa()
            self.btn_pausa.colori("▶  Riprendi la lezione", RIPRENDI, RIPRENDI_D)
            if getattr(self, "mini", None) is not None:
                self.mini.btn_pausa.colori("▶ Riprendi", RIPRENDI, RIPRENDI_D)

    def apri_finestra(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        self.scheda("reg")

    def fine_da_mini(self):
        self.apri_finestra()
        self.root.after(100, self.fine)

    def chiudi_mini(self):
        if getattr(self, "mini", None) is not None:
            try:
                self.mini.destroy()
            except tk.TclError:
                pass
            self.mini = None

    def testo_parti(self):
        righe = []
        for k in sorted(self.parti)[-2:]:
            p = self.parti[k]
            st = {"reg": "● in registrazione", "attesa": "in coda", "ok": "✓ pronta", "errore": "⚠ problema"}.get(
                p["stato"], f"testo {p.get('perc', 0) * 100:.0f}%")
            ap_ = {"ok": " · ✓ appunti", "lav": " · appunti…", "attesa": " · appunti in coda",
                   "errore": " · ⚠ appunti"}.get(p.get("ap"), "")
            righe.append(f"Parte {k}: {st}{ap_}")
        return "\n".join(righe)

    def gb_registrati(self):
        ora = time.monotonic()
        if ora - getattr(self, "_gb_t", 0) > 3 and self.cartella_corrente:
            tot = 0
            for dp, _, fs in os.walk(self.cartella_corrente):
                for n in fs:
                    try:
                        tot += os.path.getsize(os.path.join(dp, n))
                    except OSError:
                        pass
            self._gb, self._gb_t = tot / 1e9, ora
        return getattr(self, "_gb", 0.0)

    def nuova(self):
        if self.occupato:
            messagebox.showinfo(APP, "Aspetta che finisca di preparare la lezione completa.")
            return
        self.aggiorna_controlli()
        self.nome.delete(0, "end")
        self.aggiorna_nome_anteprima()
        self.disegna_recenti()
        self.mostra("pronto")

    # ------------------------------------------------------------------ appunti automatici

    def chiave(self):
        return ap.leggi_chiave(self.cfg.get("chiave", ""))

    def disegna_appunti(self):
        ha = bool(self.chiave())
        if not ha and self.cfg.get("appunti_attivi"):
            self.cfg["appunti_attivi"] = False
        self.lbl_chiave.config(text=("✓ Chiave API salvata" if ha else "✕ Chiave API non inserita"),
                               fg=GREEN if ha else RED)
        self.btn_chiave.config(text="Cambia chiave…" if ha else "Inserisci chiave…")
        on = bool(self.cfg.get("appunti_attivi"))
        c = self.sw
        c.delete("all")
        col = GREEN if on else GRIGIO_SW
        c.create_oval(0, 0, 22, 22, fill=col, outline=col)
        c.create_oval(18, 0, 40, 22, fill=col, outline=col)
        c.create_rectangle(11, 0, 29, 22, fill=col, outline=col)
        x = 21 if on else 3
        c.create_oval(x, 3, x + 16, 19, fill="white", outline="white")
        if hasattr(self, "riepilogo"):
            self.aggiorna_riepilogo()

    def cambia_appunti(self):
        if self.reg is not None:
            messagebox.showinfo(APP, "Si cambia prima di iniziare la lezione.")
            return
        if not self.chiave():
            self.finestra_chiave()
            return
        self.cfg["appunti_attivi"] = not self.cfg.get("appunti_attivi")
        salva_config(self.cfg)
        self.disegna_appunti()

    def finestra_chiave(self):
        d = tk.Toplevel(self.root)
        d.title("Chiave API di Claude")
        d.configure(bg=WIN, padx=18, pady=16)
        d.transient(self.root)
        d.resizable(False, False)
        tk.Label(d, text="Chiave API di Claude", bg=WIN, fg=INK, font=(FONT, 12, "bold")).pack(anchor="w")
        tk.Label(d, text="Si crea su platform.claude.com → Settings → API keys.\n"
                         "Resta salvata solo su questo PC, protetta da Windows.",
                 bg=WIN, fg=MUTED, font=(FONT, 9), justify="left").pack(anchor="w", pady=(4, 10))
        e = tk.Entry(d, show="•", font=(FONT, 11), width=46, relief="flat", highlightthickness=1,
                     highlightbackground=LINE, highlightcolor=BLUE)
        e.pack(fill="x", ipady=5)
        e.focus_set()
        esito = tk.Label(d, text="", bg=WIN, fg=MUTED, font=(FONT, 9), wraplength=420, justify="left")
        esito.pack(anchor="w", pady=(8, 0))
        r = tk.Frame(d, bg=WIN)
        r.pack(fill="x", pady=(12, 0))

        def togli():
            self.cfg["chiave"] = ""
            self.cfg["appunti_attivi"] = False
            salva_config(self.cfg)
            self.disegna_appunti()
            d.destroy()

        def prova():
            k = e.get().strip()
            esito.config(text="Provo la chiave…", fg=MUTED)

            def lavoro():
                try:
                    ap.prova_chiave(k)
                    self.root.after(0, lambda: riuscita(k))
                except ap.ErroreAppunti as err:
                    msg = str(err)
                    self.root.after(0, lambda: esito.config(text="✕ " + msg, fg=RED))
                except Exception:
                    log.exception("prova chiave")
                    self.root.after(0, lambda: esito.config(text="✕ Non riesco a provarla: riprova.", fg=RED))
            threading.Thread(target=lavoro, daemon=True).start()

        def riuscita(k):
            self.cfg["chiave"] = ap.nascondi_chiave(k)
            self.cfg["appunti_attivi"] = True
            salva_config(self.cfg)
            self.disegna_appunti()
            esito.config(text="✓ Chiave valida, salvata. Appunti automatici accesi.", fg=GREEN)
            d.after(1200, d.destroy)

        Bottone(r, "Prova e salva", BLUE, BLUE_D, prova, grande=False).pack(side="right")
        if self.chiave():
            BottoneMini(r, "Togli chiave", togli).pack(side="right", padx=(0, 8))
        BottoneMini(r, "Annulla", d.destroy).pack(side="right", padx=(0, 8))
        e.bind("<Return>", lambda ev: prova())
        d.grab_set()

    def accoda_appunti(self, cart, k):
        self.parti.setdefault(k, {"orario": self._orario(k)})["ap"] = "attesa"
        self.lavori_appunti.put((cart, k))

    def riprova_appunti(self, k):
        if not self.chiave():
            self.finestra_chiave()
            return
        self.accoda_appunti(self.cartella_corrente, k)
        self.ridisegna_parti()

    def lavoratore_appunti(self):
        """Manda a Claude un pacchetto alla volta e salva gli appunti."""
        while True:
            cart, k = self.lavori_appunti.get()
            if k is None:                        # solo: unisci gli appunti della lezione
                self._unisci_appunti(cart)
                continue
            self.coda.put(("ap_inizio", k))
            try:
                dest, spesa = ap.crea_appunti(cart, k, self.chiave(), self.cfg["cartella_pacchetti"])
                log.info("appunti parte %s: %s (%.3f $)", k, dest, spesa)
                self.coda.put(("ap_ok", (k, str(dest))))
                self._unisci_appunti(cart)
            except ap.ErroreAppunti as e:
                self.coda.put(("ap_err", (k, str(e))))
            except Exception:
                log.exception("appunti parte %s", k)
                self.coda.put(("ap_err", (k, "errore imprevisto (dettagli nel file registra_lezione.log)")))

    def _unisci_appunti(self, cart):
        try:
            ap.appunti_lezione_completa(cart, self.cfg["cartella_pacchetti"])
        except Exception:
            log.exception("appunti della lezione completa")

    def apri_appunti_correnti(self):
        if not self.cartella_corrente:
            return
        info = el.leggi_json(Path(self.cartella_corrente) / "info.json", {}) or {}
        tutti = info.get("appunti_completi")
        if tutti and Path(tutti).exists():
            apri(tutti)
            return
        appunti = {k: v for k, v in (info.get("appunti") or {}).items() if Path(v).exists()}
        if appunti:
            self.apri_appunti(appunti)

    def aggiorna_spesa(self):
        if not self.cartella_corrente:
            return
        info = el.leggi_json(self.cartella_corrente / "info.json", {}) or {}
        n = len(info.get("appunti") or {})
        if n:
            spesa = float(info.get("spesa_appunti") or 0)
            self.lbl_spesa.config(text=f"Appunti creati da Claude per questa lezione: {n} · "
                                       f"spesa: circa {spesa:.2f} $".replace(".", ","))
        else:
            self.lbl_spesa.config(text="")

    # ------------------------------------------------------------------ lavoro in sottofondo

    def lavoratore(self):
        """Un lavoro alla volta: trascrivere una parte, oppure preparare la lezione completa."""
        while True:
            lavoro = self.lavori.get()
            tipo, cart = lavoro[0], lavoro[1]
            cores = os.cpu_count() or 2
            # mentre si registra uso meta' del processore, cosi' Meet non rallenta
            threads = max(1, cores // 2) if self.reg is not None else max(1, cores - 1)
            try:
                if tipo == "parte":
                    k = lavoro[2]
                    self.coda.put(("parte_perc", (k, 0.0)))
                    el.trascrivi_parte(cart, k, lambda f: self.coda.put(("parte_perc", (k, f))), threads)
                    zp = el.crea_pacchetto(cart, k, self.cfg["cartella_pacchetti"])
                    self.coda.put(("parte_ok", (k, str(zp))))
                elif tipo == "finale":
                    el.elabora_finale(cart, self.cfg["cartella_pacchetti"],
                                      lambda f: self.coda.put(("finale_perc", f)), threads)
                    self.coda.put(("finale_ok", cart))
            except Exception:
                log.exception("lavoro %s", lavoro)
                if tipo == "parte":
                    self.coda.put(("parte_err", lavoro[2]))
                else:
                    self.coda.put(("errore", traceback.format_exc()))

    def prepara_modello(self):
        """Alla prima apertura scarica il modello che trascrive (una volta sola)."""
        try:
            if el.modello_presente():
                return
            self.coda.put(("modello", "Scarico il modello per la trascrizione (una volta sola)…"))
            el.scarica_modello()
            self.coda.put(("modello", ""))
        except Exception:
            log.exception("modello")
            self.coda.put(("modello", "Modello per la trascrizione non scaricato: serve internet."))

    # ------------------------------------------------------------------ aggiornamenti periodici

    def ciclo(self):
        try:
            if self.reg and self.stato == "reg":
                s = self.reg.secondi()
                self.lbl_tempo.config(text=time.strftime("%H:%M:%S", time.gmtime(s)))
                self.lbl_slide.config(text=str(self.reg.n_slide))
                in_pausa = self.reg.in_pausa
                if in_pausa:
                    self.silenzio_da = time.monotonic()      # in pausa il silenzio e' normale
                    m_, s_ = divmod(int(self.reg.secondi_di_pausa()), 60)
                    self.pallino.config(text="⏸", fg=AMBRA)
                    self.lbl_stato_rec.config(text=f" In pausa da {m_:02d}:{s_:02d} (non registro niente): ",
                                              fg=AMBRA)
                else:
                    self.pallino.config(text="●", fg=RED if int(s * 2) % 2 == 0 else WIN)
                    self.lbl_stato_rec.config(text=" Sto registrando: ", fg=INK)
                w = self.meter.winfo_width()
                self.meter.coords(self.meter_bar, 0, 0, w * self.reg.livello, 8)
                if self.reg.livello > 0.01:
                    self.silenzio_da = time.monotonic()
                if getattr(self, "mini", None) is not None:
                    avv = ""
                    if "audio" in self.reg.errori:
                        avv = "⚠ Audio non registrato"
                    elif time.monotonic() - self.silenzio_da > 60:
                        avv = "⚠ Nessun suono da 1 minuto: volume?"
                    self.mini.aggiorna(self.lbl_nome_rec.cget("text"), s, self.reg.n_slide, self.gb_registrati(),
                                       self.reg.livello, self.testo_parti(), avv,
                                       self.reg.secondi_di_pausa() if in_pausa else None)
                if "audio" in self.reg.errori:
                    self.avviso_audio.config(text="⚠ Problema con l'audio: registro solo lo schermo.")
                elif time.monotonic() - self.silenzio_da > 60:
                    self.avviso_audio.config(text="⚠ Da un minuto non sento nessun suono. "
                                                  "Controlla che il volume del PC non sia a zero o in muto.")
                else:
                    self.avviso_audio.config(text="")
            cambiato = False
            while True:
                tipo, dato = self.coda.get_nowait()
                cambiato = True
                if tipo == "parte_finita":           # e' scoccata l'ora
                    k = dato
                    self.parti[k] = {"stato": "attesa", "orario": self._orario(k)}
                    self.parti[k + 1] = {"stato": "reg", "orario": self._orario(k + 1)}
                    self.accoda_parte(self.cartella_corrente, k)
                elif tipo == "registrazione_ferma":
                    cart, ultima, durata, errori = dato
                    # tolgo le parti rimaste vuote (es. lezione fermata appena scoccata l'ora)
                    for k in list(self.parti):
                        if k > ultima:
                            self.parti.pop(k)
                    if ultima:
                        fine_audio = (ultima - 1) * el.parte_secondi(cart) + el.durata_wav(cart / f"audio_{ultima:03d}.wav")
                        p = self.parti.setdefault(ultima, {"stato": "attesa"})
                        p["orario"] = self._orario(ultima, fine_audio)
                        if p["stato"] == "reg":
                            p["stato"] = "attesa"
                        self.accoda_parte(cart, ultima)
                    self.lavori.put(("finale", cart))
                    avvisi = []
                    if "audio" in errori:
                        avvisi.append("L'audio non è stato registrato.")
                    if "video" in errori or "schermo" in errori:
                        avvisi.append("Il video ha avuto un problema (le slide catturate ci sono).")
                    self.avviso_fine.config(text="⚠ " + " ".join(avvisi) if avvisi else "")
                elif tipo == "parte_perc":
                    k, f = dato
                    if k in self.parti:
                        self.parti[k].update(stato="lav", perc=f)
                elif tipo == "parte_ok":
                    k, f = dato
                    self.parti.setdefault(k, {"orario": self._orario(k)}).update(stato="ok", file=f)
                    if self.appunti_lezione and not self.parti[k].get("ap"):
                        self.accoda_appunti(self.cartella_corrente, k)
                elif tipo == "ap_inizio":
                    if dato in self.parti:
                        self.parti[dato].update(ap="lav", ap_t0=time.monotonic())
                elif tipo == "ap_ok":
                    k, f = dato
                    if k in self.parti:
                        self.parti[k].update(ap="ok", ap_file=f)
                    self.aggiorna_spesa()
                elif tipo == "ap_err":
                    k, msg = dato
                    if k in self.parti:
                        self.parti[k].update(ap="errore", ap_err=msg)
                elif tipo == "parte_err":
                    if dato in self.parti:
                        self.parti[dato]["stato"] = "errore"
                elif tipo == "finale_perc":
                    self.finale = float(dato)
                elif tipo == "finale_ok":
                    self.finale = "ok"
                    self.lavori_appunti.put((dato, None))      # appunti in un PDF unico, se pronti
                    self.occupato = False
                    rg.tieni_sveglio(False)
                elif tipo == "modello":
                    self.lbl_modello.config(text=dato)
                elif tipo == "agg":
                    self.mostra_aggiornamento(*dato)
                elif tipo == "errore":
                    self.occupato = False
                    rg.tieni_sveglio(False)
                    self.finale = None
                    messagebox.showerror(APP, "Qualcosa è andato storto durante la preparazione.\n\n"
                                              "La registrazione è salvata: in \"Le mie lezioni\" "
                                              "tocca \"Completa\" per riprovare.\n\n" + dato.strip().splitlines()[-1])
                    self.nuova()
        except queue.Empty:
            pass
        if any(p.get("ap") == "lav" for p in self.parti.values()) and int(time.monotonic()) % 2 == 0:
            cambiato = True
        if cambiato:
            self.ridisegna_parti()
        self.root.after(250, self.ciclo)

    # ------------------------------------------------------------------ Aggiorna

    def cerca_aggiornamenti(self):
        if self.occupato:
            self.mostra_aggiornamento("msg", "Sto registrando o preparando una lezione: "
                                             "l'aggiornamento si può fare quando ho finito.")
            return
        self.mostra_aggiornamento("msg", "Cerco aggiornamenti su GitHub…")

        def lavoro():
            try:
                trovato = agg.cerca()
                if trovato is None:
                    self.coda.put(("agg", ("ok", "✓ Hai già l'ultima versione.")))
                else:
                    self.coda.put(("agg", ("trovato", trovato)))
            except agg.NonTrovato:
                log.exception("aggiorna")
                self.coda.put(("agg", ("msg", "Non trovo gli aggiornamenti su GitHub: il repository "
                                              "registra-lezione deve essere pubblico.")))
            except Exception:
                log.exception("aggiorna")
                self.coda.put(("agg", ("msg", "Non riesco a collegarmi a GitHub. Riprova più tardi.")))
        threading.Thread(target=lavoro, daemon=True).start()

    def mostra_aggiornamento(self, tipo, dato):
        b = self.box_agg
        for w in b.winfo_children():
            w.destroy()
        if not b.winfo_ismapped():
            b.pack(side="bottom", fill="x", padx=12, pady=(0, 8), after=self.piede)
        r = tk.Frame(b, bg=WIN)
        r.pack(fill="x")
        if tipo in ("msg", "ok"):
            tk.Label(r, text=dato, bg=WIN, fg=GREEN if tipo == "ok" else INK, font=(FONT, 10),
                     wraplength=440, justify="left").pack(side="left")
            BottoneMini(r, "✕", b.pack_forget).pack(side="right")
        elif tipo == "trovato":
            self.agg_trovato = dato
            sx = tk.Frame(r, bg=WIN)
            sx.pack(side="left", fill="x", expand=True)
            tk.Label(sx, text=f"C'è la versione {dato['versione']}", bg=WIN, fg=INK,
                     font=(FONT, 10, "bold")).pack(anchor="w")
            peso = f"{dato['peso'] / 1024:.0f} KB" if dato.get("peso") else ""
            sotto = " · ".join(x for x in (("Novità: " + dato["novita"]) if dato.get("novita") else "", peso) if x)
            if dato["completo"]:
                sotto = (sotto + "\n" if sotto else "") + \
                    "Questa versione cambia anche le librerie: va scaricato il pacchetto completo."
            tk.Label(sx, text=sotto, bg=WIN, fg=MUTED, font=(FONT, 9), wraplength=400,
                     justify="left").pack(anchor="w")
            if dato["completo"]:
                Bottone(r, "Apri la pagina", BLUE, BLUE_D, lambda: apri(dato["pagina"]), grande=False).pack(side="right")
            else:
                Bottone(r, "Installa", BLUE, BLUE_D, self.installa_aggiornamento, grande=False).pack(side="right")
        elif tipo == "scarico":
            tk.Label(r, text=f"Scarico l'aggiornamento… {dato * 100:.0f}%", bg=WIN, fg=INK,
                     font=(FONT, 10)).pack(anchor="w")
            c = tk.Canvas(b, height=8, bg=LINE, highlightthickness=0)
            c.pack(fill="x", pady=(6, 0))
            c.update_idletasks()
            c.create_rectangle(0, 0, c.winfo_width() * dato, 8, fill=BLUE, width=0)
        elif tipo == "fatto":
            tk.Label(r, text=f"✓ Aggiornato alla versione {dato}. Il programma si riavvia…", bg=WIN,
                     fg=GREEN, font=(FONT, 10, "bold")).pack(anchor="w")
            self.root.after(1500, self.riavvia)

    def installa_aggiornamento(self):
        dato = self.agg_trovato
        if not dato or self.occupato:
            return
        self.mostra_aggiornamento("scarico", 0.0)

        def lavoro():
            try:
                agg.installa(dato, lambda f: self.coda.put(("agg", ("scarico", f))))
                self.coda.put(("agg", ("fatto", dato["versione"])))
            except Exception:
                log.exception("installa aggiornamento")
                self.coda.put(("agg", ("msg", "Aggiornamento non riuscito. Riprova più tardi.")))
        threading.Thread(target=lavoro, daemon=True).start()

    def riavvia(self):
        try:
            agg.riavvia()
        finally:
            self.root.destroy()

    # ------------------------------------------------------------------ scheda Le mie lezioni

    def costruisci_archivio(self):
        top = tk.Frame(self.p_arch, bg=WIN)
        top.pack(fill="x", pady=(0, 6))
        tk.Label(top, text=f"Le lezioni sono in: {BASE}", bg=WIN, fg=MUTED, font=(FONT, 9),
                 wraplength=420, justify="left").pack(side="left")
        BottoneMini(top, "Apri cartella", lambda: apri(BASE)).pack(side="right")
        self.riga_video = tk.Frame(self.p_arch, bg=SOFT, highlightthickness=1, highlightbackground=LINE,
                                   padx=12, pady=8)
        self.riga_video.pack(fill="x", pady=(0, 6))
        cont = tk.Frame(self.p_arch, bg=WIN)
        cont.pack(fill="both", expand=True)
        self.canvas = tk.Canvas(cont, bg=WIN, highlightthickness=0)
        sb = tk.Scrollbar(cont, orient="vertical", command=self.canvas.yview)
        self.lista = tk.Frame(self.canvas, bg=WIN)
        self.lista.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self._win_lista = self.canvas.create_window((0, 0), window=self.lista, anchor="nw")
        self.canvas.bind("<Configure>", lambda e: self.canvas.itemconfig(self._win_lista, width=e.width))
        self.canvas.configure(yscrollcommand=sb.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        self.root.bind_all("<MouseWheel>", self._rotella)
        self.root.bind_all("<Button-4>", lambda e: self._rotella(e, -1))
        self.root.bind_all("<Button-5>", lambda e: self._rotella(e, 1))

    def _rotella(self, e, passi=None):
        c = {"imp": self.canvas_imp, "arch": self.canvas}.get(getattr(self, "tab_corrente", ""))
        if c is None:
            return
        if passi is None:
            passi = int(-e.delta / 120) or (-1 if e.delta > 0 else 1)
        c.yview_scroll(passi, "units")

    def aggiorna_archivio(self):
        for w in self.lista.winfo_children():
            w.destroy()
        cartelle = sorted((p for p in BASE.iterdir() if p.is_dir() and (p / "info.json").exists()),
                          key=lambda p: p.name, reverse=True)
        self.disegna_totale_video(cartelle)
        if not cartelle:
            tk.Label(self.lista, text="Nessuna lezione registrata, per ora.", bg=WIN, fg=MUTED,
                     font=(FONT, 11)).pack(pady=30)
            return
        for cart in cartelle:
            info = el.leggi_json(cart / "info.json", {}) or {}
            video = self.video_di(cart) if info.get("stato") == "pronta" else None
            riga = tk.Frame(self.lista, bg=WIN)
            riga.pack(fill="x", pady=(10, 0))
            tk.Label(riga, text=info.get("nome", cart.name), bg=WIN, fg=INK, font=(FONT, 11, "bold"),
                     anchor="w").pack(fill="x")
            quando = ""
            try:
                d = datetime.datetime.fromisoformat(info.get("inizio", ""))
                quando = f"{d:%d/%m/%Y} · ore {d:%H:%M}"
            except Exception:
                pass
            stato = info.get("stato")
            in_corso = cart == self.cartella_corrente and self.occupato
            appunti = {k: v for k, v in (info.get("appunti") or {}).items() if Path(v).exists()}
            if stato == "pronta":
                n_pac = len(info.get("pacchetti") or {})
                sotto = f"{quando} · {el.durata_leggibile(info.get('durata', 0))} · {info.get('n_slide', 0)} slide · {n_pac} pacchetti"
                if appunti:
                    sotto += f" · {len(appunti)} appunti"
                sotto += f" · 🎬 video {gb_testo(video.stat().st_size)}" if video else " · video eliminato"
            elif in_corso:
                sotto = f"{quando} · in lavorazione…"
            else:
                sotto = f"{quando} · da completare"
            tk.Label(riga, text=sotto, bg=WIN, fg=MUTED, font=(FONT, 9), anchor="w").pack(fill="x")
            dx = tk.Frame(riga, bg=WIN)
            dx.pack(anchor="e", pady=(6, 0))

            def btn(testo, cmd, rosso=False):
                b = BottoneMini(dx, testo, cmd)
                if rosso:
                    b.config(fg=RED)
                b.pack(side="left", padx=(6, 0))
            if stato == "pronta":
                mancano = [k for k, z in (info.get("pacchetti") or {}).items()
                           if Path(z).exists() and k not in appunti]
                if mancano and self.chiave() and not self.occupato:
                    btn("Crea appunti", lambda c=cart: self.appunti_mancanti(c))
                elif appunti and self.chiave() and not self.occupato:
                    btn("↻ Rifai appunti", lambda c=cart: self.rifai_appunti(c))
                tutti = info.get("appunti_completi")
                if tutti and Path(tutti).exists():
                    btn("📄 Apri appunti", lambda f=tutti: apri(f))
                elif appunti:
                    btn("📄 Apri appunti", lambda a=appunti: self.apri_appunti(a))
                btn("Trascrizione", lambda c=cart: self.apri_lezione(c))
                if video:
                    btn("▶ Video", lambda v=video: apri(v))
                    btn("🗑 Video", lambda c=cart: self.elimina_video([c]), rosso=True)
            elif not in_corso:
                btn("Completa", lambda c=cart: self.completa(c))
            if not in_corso:
                btn("✎ Rinomina", lambda c=cart: self.rinomina(c))
            btn("Cartella", lambda c=cart: apri(c))
            if not in_corso:
                btn("🗑 Elimina", lambda c=cart: self.elimina(c), rosso=True)
            tk.Frame(self.lista, bg=LINE, height=1).pack(fill="x", pady=(10, 0))

    @staticmethod
    def video_di(cart):
        for nome in ("video.mp4", "audio.m4a"):
            p = Path(cart) / nome
            if p.exists():
                return p
        return None

    def disegna_totale_video(self, cartelle):
        f = self.riga_video
        for w in f.winfo_children():
            w.destroy()
        con_video = [c for c in cartelle
                     if (el.leggi_json(c / "info.json", {}) or {}).get("stato") == "pronta"
                     and not (c == self.cartella_corrente and self.occupato) and self.video_di(c)]
        tot = sum(self.video_di(c).stat().st_size for c in con_video)
        tk.Label(f, text=f"🎬 Video sul PC: {gb_testo(tot)}", bg=SOFT, fg=INK,
                 font=(FONT, 10, "bold")).pack(side="left")
        tk.Label(f, text="  (appunti e trascrizioni occupano pochissimo)", bg=SOFT, fg=MUTED,
                 font=(FONT, 8)).pack(side="left")
        if con_video:
            b = BottoneMini(f, "Elimina tutti i video…", lambda: self.elimina_video(con_video), bg=WIN)
            b.config(fg=RED)
            b.pack(side="right")

    def elimina_video(self, cartelle):
        """Elimina DEFINITIVAMENTE i video (nel Cestino occuperebbero ancora spazio).
        Appunti, slide, trascrizione e pacchetti restano."""
        video = [v for v in (self.video_di(c) for c in cartelle) if v]
        if not video:
            return
        tot = gb_testo(sum(v.stat().st_size for v in video))
        if len(video) == 1:
            info = el.leggi_json(Path(cartelle[0]) / "info.json", {}) or {}
            testo = f"Eliminare il video di «{info.get('nome', '')}»?\n\nLibera {tot}."
        else:
            testo = f"Eliminare i video di {len(video)} lezioni?\n\nLibera {tot}."
        testo += ("\n\nIl video si elimina definitivamente, così lo spazio si libera subito.\n"
                  "Restano: appunti, slide, trascrizione e pacchetti.")
        if not messagebox.askyesno(APP, testo):
            return
        for v in video:
            try:
                v.unlink()
            except OSError:
                log.exception("elimina video %s", v)
        self.aggiorna_archivio()

    @staticmethod
    def apri_lezione(cart):
        pdf = sorted(Path(cart).glob("Per Claude - *.pdf"))
        apri(pdf[0] if pdf else Path(cart) / "Lezione.html")

    def apri_appunti(self, appunti):
        if len(appunti) == 1:
            apri(next(iter(appunti.values())))
            return
        m = tk.Menu(self.root, tearoff=0)
        for k in sorted(appunti, key=int):
            m.add_command(label=f"Appunti parte {k}", command=lambda f=appunti[k]: apri(f))
        x, y = self.root.winfo_pointerx(), self.root.winfo_pointery()
        try:
            m.tk_popup(x, y)
        finally:
            m.grab_release()

    def rinomina(self, cart):
        cart = Path(cart)
        info = el.leggi_json(cart / "info.json", {}) or {}
        vecchio = info.get("nome", "Lezione")
        d = tk.Toplevel(self.root)
        d.title("Rinomina la lezione")
        d.configure(bg=WIN, padx=18, pady=16)
        d.transient(self.root)
        d.resizable(False, False)
        tk.Label(d, text="Rinomina la lezione", bg=WIN, fg=INK, font=(FONT, 12, "bold")).pack(anchor="w")
        e = tk.Entry(d, font=(FONT, 11), width=44, relief="flat", highlightthickness=1,
                     highlightbackground=LINE, highlightcolor=BLUE)
        e.pack(fill="x", ipady=5, pady=(8, 0))
        e.insert(0, vecchio)
        e.select_range(0, "end")
        e.focus_set()
        tk.Label(d, text="Cambia anche il nome di pacchetti e appunti.", bg=WIN, fg=MUTED,
                 font=(FONT, 9)).pack(anchor="w", pady=(6, 0))
        r = tk.Frame(d, bg=WIN)
        r.pack(fill="x", pady=(12, 0))

        def salva():
            nuovo = e.get().strip()
            d.destroy()
            if nuovo and nuovo != vecchio:
                try:
                    self.applica_rinomina(cart, vecchio, nuovo)
                except Exception:
                    log.exception("rinomina")
                    messagebox.showerror(APP, "Non sono riuscito a rinominare tutto.\n"
                                              "Forse un file è aperto: chiudilo e riprova.")
                self.aggiorna_archivio()
        Bottone(r, "Salva", BLUE, BLUE_D, salva, grande=False).pack(side="right")
        BottoneMini(r, "Annulla", d.destroy).pack(side="right", padx=(0, 8))
        e.bind("<Return>", lambda ev: salva())
        d.grab_set()

    def applica_rinomina(self, cart, vecchio, nuovo):
        vb, nb = el.nome_sicuro(vecchio), el.nome_sicuro(nuovo)
        info = el.leggi_json(cart / "info.json", {}) or {}

        def cambia(percorso):
            p = Path(percorso)
            if p.exists() and vb in p.name:
                q = p.with_name(p.name.replace(vb, nb, 1))
                if not q.exists():
                    p.rename(q)
                    return str(q)
            return str(p)
        info["pacchetti"] = {k: cambia(v) for k, v in (info.get("pacchetti") or {}).items()}
        info["appunti"] = {k: cambia(v) for k, v in (info.get("appunti") or {}).items()}
        for p in cart.glob("Per Claude - *.pdf"):
            cambia(p)
        info["nome"] = nuovo
        el.scrivi_json(cart / "info.json", info)
        self.ricorda_materia(nuovo)
        # anche la cartella della lezione: "AAAA-MM-GG HHMM - nome"
        if " - " in cart.name:
            nuova = cart.with_name(cart.name.split(" - ", 1)[0] + " - " + nb)
            if not nuova.exists():
                cart.rename(nuova)
                if self.cartella_corrente == cart:
                    self.cartella_corrente = nuova

    def elimina(self, cart):
        cart = Path(cart)
        info = el.leggi_json(cart / "info.json", {}) or {}
        quando = ""
        try:
            quando = f"{datetime.datetime.fromisoformat(info.get('inizio', '')):%d/%m/%Y ore %H:%M}"
        except Exception:
            pass
        d = tk.Toplevel(self.root)
        d.title("Eliminare la lezione?")
        d.configure(bg=WIN, padx=18, pady=16)
        d.transient(self.root)
        d.resizable(False, False)
        tk.Label(d, text="Eliminare questa lezione?", bg=WIN, fg=INK, font=(FONT, 12, "bold")).pack(anchor="w")
        tk.Label(d, text=info.get("nome", cart.name), bg=WIN, fg=INK, font=(FONT, 11)).pack(anchor="w", pady=(6, 0))
        tk.Label(d, text=quando, bg=WIN, fg=MUTED, font=(FONT, 9)).pack(anchor="w")
        tk.Label(d, text="Vanno nel Cestino di Windows: registrazione, video, slide e testo.\n"
                         "Se ti sbagli, la recuperi da lì.", bg=WIN, fg=MUTED, font=(FONT, 9),
                 justify="left").pack(anchor="w", pady=(8, 0))
        anche = tk.BooleanVar(value=False)
        tk.Checkbutton(d, text="Elimina anche i pacchetti e gli appunti di questa lezione",
                       variable=anche, bg=WIN, fg=INK, font=(FONT, 10), activebackground=WIN,
                       anchor="w").pack(anchor="w", pady=(8, 0))
        r = tk.Frame(d, bg=WIN)
        r.pack(fill="x", pady=(12, 0))

        def conferma():
            d.destroy()
            file_extra = []
            if anche.get():
                file_extra = [v for v in list((info.get("pacchetti") or {}).values()) +
                              list((info.get("appunti") or {}).values()) if Path(v).exists()]
            try:
                al_cestino([cart] + [Path(f) for f in file_extra])
            except Exception:
                log.exception("elimina")
                messagebox.showerror(APP, "Non sono riuscito a eliminare la lezione.\n"
                                          "Forse un file è aperto: chiudilo e riprova.")
            self.aggiorna_archivio()
        Bottone(r, "🗑 Elimina", RED, RED_D, conferma, grande=False).pack(side="right")
        BottoneMini(r, "Annulla", d.destroy).pack(side="right", padx=(0, 8))
        d.grab_set()

    # ------------------------------------------------------------------ chiusura / errori

    def chiudi(self):
        if self.reg:
            messagebox.showwarning(APP, "Sto registrando.\nPrima tocca \"Fine lezione\".")
            return
        if self.occupato:
            if not messagebox.askyesno(APP, "Sto ancora preparando la lezione.\n\n"
                                            "Se chiudi adesso potrai finire dopo con \"Completa\" "
                                            "in \"Le mie lezioni\".\n\nChiudo lo stesso?"):
                return
        rg.tieni_sveglio(False)
        self.root.destroy()

    def errore_tk(self, *args):
        log.error("errore finestra: %s", "".join(traceback.format_exception(*args)))
        messagebox.showerror(APP, f"Errore: {args[1]}\n\nDettagli nel file registra_lezione.log")


def main():
    root = tk.Tk()
    app = App(root)
    root.after(300, app.aggiorna_controlli)
    root.mainloop()


if __name__ == "__main__":
    main()
