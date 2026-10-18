# -*- coding: utf-8 -*-
"""
«⬇ Esporta per Anki»: le flashcard in un file .apkg da aprire con Anki (PC, Mac, AnkiDroid, AnkiMobile).

Una nota per carta (Domanda, Risposta, Slide, Fonte), un mazzo per materia («Verba Manent IA::Fisiologia»).
Gli identificativi (guid della nota, id del tipo di nota e del mazzo) sono sempre gli stessi per la stessa carta:
se si esporta di nuovo, Anki AGGIORNA le carte che ha gia' (e tiene i ripassi fatti) e aggiunge le nuove.

Il file e' un .zip con dentro collection.anki2 (SQLite, schema 11, quello che tutte le versioni di Anki importano),
il file «media» (numero -> nome) e le immagini delle slide.
"""
import hashlib
import html
import json
import os
import sqlite3
import tempfile
import time
import zipfile
from pathlib import Path

ID_MODELLO = 1729400000001          # sempre lo stesso: le esportazioni successive aggiornano le stesse note
NOME_MODELLO = "Verba Manent IA"


def _num(*x, bit=62):
    h = hashlib.sha256("__".join(str(v) for v in x).encode("utf-8")).digest()
    return int.from_bytes(h[:8], "big") & ((1 << bit) - 1)


def _guid(*x):
    """Come Anki: 10 caratteri base91 da un numero a 64 bit."""
    alfa = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~"
    n = _num(*x, bit=64)
    s = ""
    while n:
        n, r = divmod(n, len(alfa))
        s = alfa[r] + s
    return s or "a"


CSS = """.card{font-family:Verdana,Arial,sans-serif;font-size:19px;line-height:1.45;color:#1f2937;background:#fff;text-align:left;padding:6px}
.nightMode .card,.card.nightMode{color:#e5e7eb;background:#111827}
.st{color:#d97706;font-size:15px;letter-spacing:2px}.dom{font-weight:700}
ul{margin:8px 0;padding-left:22px}li{margin:3px 0}
.agg{color:#475569;font-size:16px}.err{background:#fff7ed;color:#9a3412;border-radius:8px;padding:6px 10px;font-size:16px;margin-top:8px}
.kw{color:#0d4275;font-size:15px;margin-top:6px}.slide img{max-width:100%;border-radius:8px;margin-top:10px}
.fonte{color:#64748b;font-size:14px;margin-top:10px}"""

FRONTE = '<div class="dom">{{Domanda}}</div>'
RETRO = ('{{FrontSide}}<hr id="answer">{{Risposta}}{{#Slide}}<div class="slide">{{Slide}}</div>{{/Slide}}'
         '<div class="fonte">{{Fonte}}</div>')


def _modello(ora, id_mazzo):
    campi = ["Domanda", "Risposta", "Slide", "Fonte"]
    return {
        "css": CSS, "did": id_mazzo, "id": str(ID_MODELLO), "latexPost": "\\end{document}",
        "latexPre": "\\documentclass[12pt]{article}\\special{papersize=3in,5in}\\usepackage[utf8]{inputenc}"
                    "\\usepackage{amssymb,amsmath}\\pagestyle{empty}\\setlength{\\parindent}{0in}\\begin{document}",
        "latexsvg": False, "mod": ora, "name": NOME_MODELLO, "req": [[0, "any", [0]]], "sortf": 0, "tags": [],
        "type": 0, "usn": -1, "vers": [],
        "flds": [{"name": n, "ord": i, "font": "Arial", "media": [], "rtl": False, "size": 20, "sticky": False} for i, n in enumerate(campi)],
        "tmpls": [{"name": "Carta", "ord": 0, "qfmt": FRONTE, "afmt": RETRO, "bafmt": "", "bqfmt": "", "bfont": "", "bsize": 0, "did": None}],
    }


def _mazzo(id_, nome, ora):
    return {"collapsed": False, "conf": 1, "desc": "Verba Manent IA", "dyn": 0, "extendNew": 0, "extendRev": 50, "id": id_,
            "lrnToday": [0, 0], "mod": ora, "name": nome, "newToday": [0, 0], "revToday": [0, 0], "timeToday": [0, 0], "usn": -1}


CONF = {"activeDecks": [1], "addToCur": True, "collapseTime": 1200, "curDeck": 1, "curModel": str(ID_MODELLO), "dueCounts": True,
        "estTimes": True, "newBury": True, "newSpread": 0, "nextPos": 1, "sortBackwards": False, "sortType": "noteFld", "timeLim": 0}
DCONF = {"1": {"autoplay": True, "id": 1, "lapse": {"delays": [10], "leechAction": 0, "leechFails": 8, "minInt": 1, "mult": 0},
               "maxTaken": 60, "mod": 0, "name": "Default", "new": {"bury": True, "delays": [1, 10], "initialFactor": 2500,
               "ints": [1, 4, 7], "order": 1, "perDay": 20, "separate": True}, "replayq": True,
               "rev": {"bury": True, "ease4": 1.3, "fuzz": 0.05, "ivlFct": 1, "maxIvl": 36500, "minSpace": 1, "perDay": 100},
               "timer": 0, "usn": 0}}

SCHEMA = """
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null,
  dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null,
  dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null,
  tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null,
  usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null,
  factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null,
  lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn); CREATE INDEX ix_cards_usn on cards (usn); CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid); CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid); CREATE INDEX ix_notes_csum on notes (csum);
"""


def _csum(testo):
    import re
    pulito = re.sub(r"<[^>]+>", "", testo)
    return int(hashlib.sha1(pulito.encode("utf-8")).hexdigest()[:8], 16)


def risposta_html(c, L="it"):
    e = html.escape
    parti = []
    if c.get("schema"):
        parti.append("<ul>" + "".join(f"<li>{e(str(x))}</li>" for x in c["schema"]) + "</ul>")
    if c.get("aggiunte"):
        parti.append('<div class="agg">' + "<br>".join("+ " + e(str(x)) for x in c["aggiunte"]) + "</div>")
    if c.get("errore"):
        parti.append(f'<div class="err">⚠ {e(str(c["errore"]))}</div>')
    if c.get("parole"):
        parti.append('<div class="kw">🔑 ' + e(", ".join(str(x) for x in c["parole"])) + "</div>")
    return "".join(parti) or "—"


def crea(carte, materia_di, dest, immagine_di, L="it"):
    """carte: quelle di ripasso.carte_lezione; materia_di(cartella) -> nome della materia;
    immagine_di(carta) -> percorso dell'immagine della slide (o None). Torna quante carte."""
    ora = int(time.time())
    fd, db = tempfile.mkstemp(suffix=".anki2")
    os.close(fd)
    media = []            # [(nome nello zip, percorso)]
    nomi_media = {}
    try:
        con = sqlite3.connect(db)
        cur = con.cursor()
        cur.executescript(SCHEMA)
        mazzi = {"1": _mazzo(1, "Default", ora)}
        ids_mazzo = {}
        n = 0
        visti = set()
        for c in carte:
            cart = Path(c["cartella"])
            mat = materia_di(str(cart)) or c.get("lezione") or "Lezioni"
            nome_mazzo = f"Verba Manent IA::{mat}"
            did = ids_mazzo.get(nome_mazzo)
            if did is None:
                did = ids_mazzo[nome_mazzo] = 1500000000000 + _num("mazzo", nome_mazzo, bit=40)
                mazzi[str(did)] = _mazzo(did, nome_mazzo, ora)
            guid = _guid("vmia", cart.name, c["id"])
            if guid in visti:
                continue
            visti.add(guid)
            slide = ""
            img = immagine_di(c)
            if img and Path(img).exists():
                if str(img) not in nomi_media:
                    nomi_media[str(img)] = f"vmia_{_num('img', cart.name, Path(img).name, bit=48):x}{Path(img).suffix.lower() or '.jpg'}"
                    media.append((nomi_media[str(img)], str(img)))
                slide = f'<img src="{nomi_media[str(img)]}">'
            stelle = '<span class="st">' + "★" * c["stelle"] + "</span><br>" if c.get("stelle") else ""
            dom = stelle + html.escape(c["domanda"])
            fonte = html.escape(c.get("lezione") or cart.name) + (f" · min {int(c['minuto'])}" if c.get("minuto") is not None else "")
            campi = [dom, risposta_html(c, L), slide, fonte]
            nid = _num("nota", guid, bit=52) + 1
            tags = " vmia " + mat.replace(" ", "_") + " "
            cur.execute("INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                        (nid, guid, ID_MODELLO, ora, -1, tags, "\x1f".join(campi), html.escape(c["domanda"]), _csum(c["domanda"]), 0, ""))
            cur.execute("INSERT INTO cards VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (_num("carta", guid, bit=52) + 1, nid, did, 0, ora, -1, 0, 0, n + 1, 0, 0, 0, 0, 0, 0, 0, 0, ""))
            n += 1
        primo = next(iter(ids_mazzo.values()), 1)
        cur.execute("INSERT INTO col VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (1, ora - ora % 86400, ora * 1000, ora * 1000, 11, 0, 0, 0, json.dumps(CONF),
                     json.dumps({str(ID_MODELLO): _modello(ora, primo)}), json.dumps(mazzi), json.dumps(DCONF), "{}"))
        con.commit()
        con.close()
        tmp = str(dest) + ".tmp"
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            z.write(db, "collection.anki2")
            z.writestr("media", json.dumps({str(i): nome for i, (nome, _) in enumerate(media)}))
            for i, (_, p) in enumerate(media):
                z.write(p, str(i), compress_type=zipfile.ZIP_STORED)
        os.replace(tmp, dest)
        return n
    finally:
        try:
            os.unlink(db)
        except OSError:
            pass
