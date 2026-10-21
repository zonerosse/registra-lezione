# -*- coding: utf-8 -*-
"""
Controllo di verita' degli appunti (gratis, sul PC): quello che Claude scrive viene confrontato
con la registrazione.
  - le frasi tra virgolette attribuite al docente devono trovarsi (quasi uguali) nella trascrizione;
    in "perche" (Formato Esame) se non si trovano vengono tolte, altrove restano ma con l'avviso;
  - i minuti citati in "dove" devono stare dentro la lezione;
  - i numeri di slide devono esistere nel pacchetto.
Ogni domanda/blocco puo' ricevere "avvisi" (mostrati come "da verificare") e, per il Formato
Esame, "perche_ok" quando la frase del docente e' stata trovata.
"""
import difflib
import re
import unicodedata
from pathlib import Path

import elaborazione as el
from testi import tr

_VIRG = re.compile(r"[«“\"]([^«»“”\"]{8,300})[»”\"]")
_ORA = re.compile(r"\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b")
_SLIDE = re.compile(r"\bslide\s*(\d+)", re.IGNORECASE)


def _parole(s):
    s = unicodedata.normalize("NFKD", str(s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.findall(r"[a-z0-9]+", s)


class Trascrizione:
    def __init__(self, cartella):
        segs = []
        for f in sorted(Path(cartella).glob("trascrizione_*.json")):
            segs += el.leggi_json(f, []) or []
        self.parole = []
        for sg in sorted(segs, key=lambda x: x.get("inizio", 0)):
            self.parole += _parole(sg.get("testo", ""))
        self.indice = {}
        for i, w in enumerate(self.parole):
            self.indice.setdefault(w, []).append(i)
        self.fine = max((sg.get("fine", 0) for sg in segs), default=0)

    def contiene(self, frase, soglia=0.72):
        """True se la frase (o quasi) e' stata detta. Confronto parola per parola."""
        q = _parole(frase)
        if len(q) < 3:
            return True                      # troppo corta per giudicare: la lascio stare
        n = len(q)
        candidati = set()
        for w in q[:4]:
            for i in self.indice.get(w, [])[:400]:
                candidati.add(max(0, i - q.index(w)))
        for i in candidati:
            fin = self.parole[i:i + n + 3]
            if difflib.SequenceMatcher(None, q, fin, autojunk=False).ratio() >= soglia:
                return True
        return False


def _secondi(m):
    a, b, c = m.group(1), m.group(2), m.group(3)
    return int(a) * 3600 + int(b) * 60 + int(c) if c else int(a) * 60 + int(b)


def _controlla_testo(s, tr_, avvisi, L):
    """Frasi tra virgolette non trovate -> avviso. Ritorna True se tutte trovate (o nessuna)."""
    tutte = True
    for m in _VIRG.finditer(str(s or "")):
        if not tr_.contiene(m.group(1)):
            avvisi.append(tr("vr_frase", L, f=m.group(1)[:80]))
            tutte = False
    return tutte


def _controlla_dove(dove, durata, n_slide, avvisi, L):
    for m in _ORA.finditer(str(dove or "")):
        sec = _secondi(m)
        # "01:26" puo' essere anche ore:minuti: lo segnalo solo se non torna in nessun modo
        alt = int(m.group(1)) * 3600 + int(m.group(2)) * 60 if not m.group(3) else sec
        if durata and sec > durata + 120 and alt > durata + 120:
            avvisi.append(tr("vr_minuto", L, m=m.group(0)))
    for m in _SLIDE.finditer(str(dove or "")):
        if n_slide and int(m.group(1)) > n_slide:
            avvisi.append(tr("vr_slide", L, n=m.group(1)))


def controlla(dati, cartella, n_slide=0, L="it"):
    """Controlla e corregge gli appunti (dizionario) sul posto. Ritorna il numero di avvisi."""
    trs = Trascrizione(cartella)
    info = el.leggi_json(Path(cartella) / "info.json", {}) or {}
    durata = max(float(info.get("durata") or 0), trs.fine)
    if not trs.parole:
        return 0
    tot = 0
    # capitoli: tolgo quelli con un orario che non c'e' nella registrazione
    if dati.get("capitoli"):
        buoni = []
        for c in dati["capitoli"]:
            m = _ORA.search(str(c.get("inizio") or ""))
            if m and (not durata or _secondi(m) <= durata + 120):
                c["sec"] = _secondi(m)
                buoni.append(c)
        dati["capitoli"] = buoni
    voci = dati.get("domande_probabili")
    esame = voci is not None
    if not esame:
        voci = dati.get("blocchi") or []
    altri = None
    if "sezioni" in dati:                     # «Il mio formato»
        voci, altri = dati.get("sezioni") or [], "punti"
    elif "decisioni" in dati or "azioni" in dati:          # verbale
        voci, altri = (dati.get("decisioni") or []) + (dati.get("azioni") or []) + \
            (dati.get("da_decidere") or []) + (dati.get("punti_discussi") or []), "verbale"
    for v in voci:
        if not isinstance(v, dict):
            continue
        avvisi = []
        if esame:
            perche = v.get("perche") or ""
            if _VIRG.search(perche):
                prima = len(avvisi)
                if _controlla_testo(perche, trs, avvisi, L):
                    v["perche_ok"] = True
                else:
                    # frase del docente inventata o storpiata: la tolgo, resta solo il resto del motivo
                    v["perche"] = re.sub(r"\s+", " ", _VIRG.sub("", perche)).strip(" ,;:-–")
                    avvisi[prima:] = [tr("vr_tolta", L)]
            for x in (v.get("schema") or []) + [v.get("errore") or ""]:
                _controlla_testo(x, trs, avvisi, L)
        elif altri == "punti":
            for x in v.get("punti") or []:
                _controlla_testo(x, trs, avvisi, L)
        elif altri == "verbale":
            for x in (v.get("testo"), v.get("cosa"), *(v.get("punti") or [])):
                _controlla_testo(x, trs, avvisi, L)
        else:
            for x in v.get("appunti") or []:
                _controlla_testo(x, trs, avvisi, L)
        _controlla_dove(v.get("dove"), durata, n_slide, avvisi, L)
        try:
            if n_slide and int(v.get("slide") or 0) > n_slide:
                v["slide"] = 0
        except (TypeError, ValueError):
            v["slide"] = 0
        if avvisi:
            v["avvisi"] = list(dict.fromkeys(avvisi))
            tot += len(v["avvisi"])
        else:
            v.pop("avvisi", None)
    return tot
