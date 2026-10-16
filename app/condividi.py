# -*- coding: utf-8 -*-
"""
«Condividi e collega»: il verbale (o gli appunti) di una registrazione
  - per email (Outlook / Posta di Windows con il PDF allegato, oppure Gmail nel browser),
  - in Word (.docx) e in Google Docs (tramite la cartella di Google Drive sul PC),
  - le cose da fare e la prossima riunione nel calendario (file .ics per Outlook, link per Google Calendar),
  - a Slack, Microsoft Teams, Notion e al CRM (HubSpot, oppure un indirizzo di Zapier/Make per gli altri).
Il programma non manda email da solo: le prepara e le apre. Slack, Teams, Notion e CRM si collegano una volta
(indirizzo o chiave cifrati sul PC come la chiave di Claude) e possono ricevere il riassunto da soli.
"""
import datetime
import email.message
import email.utils
import html
import json
import logging
import mimetypes
import os
import re
import ssl
import string
import sys
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path

import appunti as ap
import elaborazione as el
import testi
from testi import tr

log = logging.getLogger("registra_lezione")
SERVIZI = ("slack", "teams", "notion", "crm")


class ErroreCondividi(Exception):
    pass


# --------------------------------------------------------------------------- il contenuto da condividere

def _parti(info, formato):
    fatti = info.get(ap.chiave_info(formato)) or {}
    return sorted(fatti, key=int)


def formato_da_condividere(info):
    """Il formato degli appunti da condividere: il verbale se c'e', poi quello scelto, poi qualsiasi."""
    pref = ["verbale", info.get("formato_appunti") or "cornell"] + list(ap.FORMATI)
    for f in pref:
        if _parti(info, f):
            return f
    return None


def _data_reg(info):
    try:
        return datetime.datetime.fromisoformat(info.get("inizio", ""))
    except ValueError:
        return datetime.datetime.now()


def _pulisci(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def _unici(lista, chiave=lambda x: x):
    """Toglie i doppioni (le parti si sovrappongono di qualche secondo: la stessa cosa puo' tornare due volte)."""
    visti, out = set(), []
    for x in lista:
        k = re.sub(r"\W+", " ", str(chiave(x) or "")).strip().lower()
        if k and k in visti:
            continue
        visti.add(k)
        out.append(x)
    return out


def documento(cartella, formato=None):
    """Il verbale / gli appunti di tutta la registrazione in una forma semplice da scrivere ovunque:
    {"titolo", "sottotitolo", "formato", "pdf", "breve", "sezioni": [{"titolo", "testo", "punti", "numerati",
    "aggiunte", "tabella": {"teste", "righe"}}], "azioni", "prossima", "partecipanti", "data"}."""
    cartella = Path(cartella)
    info = el.leggi_json(cartella / "info.json", {}) or {}
    formato = formato or formato_da_condividere(info)
    if not formato:
        raise ErroreCondividi(tr("cd_niente"))
    L = testi.lingua_di(info)
    parti = [d for d in (el.leggi_json(ap.file_json(cartella, k, formato)) for k in _parti(info, formato)) if d]
    if not parti:
        raise ErroreCondividi(tr("cd_niente"))
    quando = _data_reg(info)
    part = [p for p in info.get("partecipanti") or []]
    sotto = [quando.strftime("%d/%m/%Y")]
    if info.get("durata"):
        sotto.append(el.durata_leggibile(info["durata"]))
    if part:
        sotto.append(tr("vb_partecipanti", L) + ": " + ", ".join(part))
    pdf = info.get(ap.chiave_completi(formato))
    if not pdf or not Path(pdf).exists():
        fatti = ap.appunti_fatti(info, formato)
        pdf = fatti[sorted(fatti, key=int)[-1]] if fatti else ""
    doc = {"titolo": info.get("nome", ""), "sottotitolo": " · ".join(sotto), "formato": formato, "pdf": pdf or "",
           "sezioni": [], "azioni": [], "prossima": None, "breve": "", "partecipanti": part, "data": quando,
           "tipo": info.get("tipo") or "lezione", "lingua": L}
    S = doc["sezioni"]

    def sez(titolo, **kw):
        s = {"titolo": titolo, "testo": "", "punti": [], "numerati": False, "aggiunte": [], "tabella": None}
        s.update(kw)
        S.append(s)
        return s

    if formato == "verbale":
        breve = " ".join(_unici(_pulisci(d.get("in_breve")) for d in parti if d.get("in_breve")))
        doc["breve"] = breve
        if breve:
            sez(tr("vb_breve", L), testo=breve)
        extra = {}
        for d in parti:
            for se in d.get("sezioni_extra") or []:
                extra.setdefault(_pulisci(se.get("titolo")), []).extend(_pulisci(x) for x in se.get("punti") or [] if _pulisci(x))
        for tit, punti in extra.items():
            if punti:
                sez(tit, punti=_unici(punti))
        dec = _unici([d2 for d in parti for d2 in d.get("decisioni") or []], lambda x: x.get("testo"))
        if dec:
            sez(tr("vb_decisioni", L), numerati=True,
                punti=[_pulisci(x.get("testo")) + (f" ({x['chi']})" if x.get("chi") else "") for x in dec])
        az = _unici([a for d in parti for a in d.get("azioni") or []], lambda x: x.get("cosa"))
        for a in az:
            data = data_da_testo(a.get("entro"), quando)
            doc["azioni"].append({"cosa": _pulisci(a.get("cosa")), "chi": _pulisci(a.get("chi")),
                                  "entro": _pulisci(a.get("entro")), "data": data.isoformat() if data else ""})
        if az:
            sez(tr("vb_azioni", L), tabella={"teste": [tr("vb_cosa", L), tr("vb_chi", L), tr("vb_entro", L)],
                                             "righe": [[a["cosa"], a["chi"], a["entro"]] for a in doc["azioni"]]})
        dd = _unici([x for d in parti for x in d.get("da_decidere") or []], lambda x: x.get("testo"))
        if dd:
            sez(tr("vb_da_decidere", L), punti=[_pulisci(x.get("testo")) for x in dd])
        pr = next((d["prossima_riunione"] for d in reversed(parti) if (d.get("prossima_riunione") or {}).get("quando")), None)
        if pr:
            sez(tr("vb_prossima", L), testo=_pulisci(pr.get("quando")) + (f" – {_pulisci(pr['note'])}" if pr.get("note") else ""))
            g, ora = data_da_testo(pr.get("quando"), quando), ora_da_testo(pr.get("quando"))
            doc["prossima"] = {"quando": _pulisci(pr.get("quando")), "note": _pulisci(pr.get("note")),
                               "data": g.isoformat() if g else "", "ora": ora}
        for d in parti:
            for p in d.get("punti_discussi") or []:
                sez(_pulisci(p.get("titolo")), punti=[_pulisci(x) for x in p.get("punti") or []],
                    aggiunte=[_pulisci(x) for x in p.get("aggiunte") or []], livello=2)
        if any(d.get("punti_discussi") for d in parti):
            # titolo del gruppo prima dei punti discussi
            i = next(i for i, s in enumerate(S) if s.get("livello") == 2)
            S.insert(i, {"titolo": tr("vb_discussi", L), "testo": "", "punti": [], "numerati": False, "aggiunte": [], "tabella": None})
    elif formato == "esame":
        for d in parti:
            for q in d.get("domande_probabili") or []:
                sez("★" * int(q.get("stelle") or 1) + " " + _pulisci(q.get("domanda")), numerati=True,
                    punti=[_pulisci(x) for x in q.get("schema") or []], aggiunte=[_pulisci(x) for x in q.get("aggiunte") or []],
                    testo=(tr("cd_errore", L) + ": " + _pulisci(q["errore"])) if q.get("errore") else "")
        pk = [p for d in parti for p in d.get("parole_chiave") or [] if isinstance(p, dict)]
        if pk:
            sez(tr("cd_parole", L), tabella={"teste": ["", ""], "righe": [[_pulisci(p.get("parola")), _pulisci(p.get("significato"))] for p in pk]})
        doc["breve"] = "; ".join(_pulisci(q.get("domanda")) for d in parti for q in (d.get("domande_probabili") or [])[:3])
    elif formato == "mio":
        rias = " ".join(_pulisci(d.get("riassunto")) for d in parti if d.get("riassunto"))
        doc["breve"] = rias
        for d in parti:
            for s in d.get("sezioni") or []:
                sez(_pulisci(s.get("titolo")), punti=[_pulisci(x) for x in s.get("punti") or []],
                    aggiunte=[_pulisci(x) for x in s.get("aggiunte") or []])
        if rias:
            sez(tr("cd_riassunto", L), testo=rias)
    else:       # cornell e webinar
        rias = " ".join(_pulisci(d.get("riassunto")) for d in parti if d.get("riassunto"))
        doc["breve"] = rias
        if rias:
            sez(tr("cd_riassunto", L), testo=rias)
        for d in parti:
            for b in d.get("blocchi") or []:
                sez(_pulisci(b.get("domanda")), punti=[_pulisci(x) for x in b.get("appunti") or []],
                    aggiunte=[_pulisci(x) for x in b.get("aggiunte") or []])
            for e in d.get("esercizi_svolti") or []:
                sez(_pulisci(e.get("titolo")), numerati=True, punti=[_pulisci(x) for x in e.get("passaggi") or []])
        fo = [f for d in parti for f in d.get("formulario") or [] if isinstance(f, dict)]
        if fo:
            sez(tr("cd_formulario", L), tabella={"teste": ["", ""], "righe": [[_pulisci(f.get("simbolo")), _pulisci(f.get("significato"))] for f in fo]})
    if not doc["breve"]:
        doc["breve"] = _pulisci(parti[0].get("titolo"))
    return doc


# --------------------------------------------------------------------------- date dette a voce ("venerdì", "entro il 30/10")

_GIORNI = {"lun": 0, "mar": 1, "mer": 2, "gio": 3, "ven": 4, "sab": 5, "dom": 6,
           "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
_MESI = {"gen": 1, "feb": 2, "mar": 3, "apr": 4, "mag": 5, "giu": 6, "lug": 7, "ago": 8, "set": 9, "ott": 10,
         "nov": 11, "dic": 12, "jan": 1, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "dec": 12}


def data_da_testo(testo, riferimento):
    """La data di "venerdì 17/10", "entro il 30/10", "domani", "lunedì prossimo", "30 ottobre"... None se non si capisce."""
    t = (testo or "").lower()
    if not t.strip():
        return None
    base = riferimento.date() if isinstance(riferimento, datetime.datetime) else riferimento
    m = re.search(r"\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b", t)
    if m:
        g, me = int(m.group(1)), int(m.group(2))
        a = int(m.group(3)) if m.group(3) else base.year
        a += 2000 if a < 100 else 0
        try:
            d = datetime.date(a, me, g)
            if not m.group(3) and d < base - datetime.timedelta(days=60):
                d = datetime.date(a + 1, me, g)
            return d
        except ValueError:
            pass
    m = re.search(r"\b(\d{1,2})\s+(?:di\s+)?([a-z]{3})[a-z]*", t)
    if m and m.group(2) in _MESI:
        try:
            d = datetime.date(base.year, _MESI[m.group(2)], int(m.group(1)))
            return d if d >= base - datetime.timedelta(days=60) else datetime.date(base.year + 1, d.month, d.day)
        except ValueError:
            pass
    if re.search(r"\b(dopodomani|day after tomorrow)\b", t):
        return base + datetime.timedelta(days=2)
    if re.search(r"\b(domani|tomorrow)\b", t):
        return base + datetime.timedelta(days=1)
    if re.search(r"\b(oggi|today|stasera|tonight)\b", t):
        return base
    for w in re.findall(r"[a-zì]+", t):
        k = w[:3]
        if k in _GIORNI and (w.startswith(("lun", "mar", "mer", "gio", "ven", "sab", "dom")) and len(w) >= 5
                             or w in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")):
            return base + datetime.timedelta(days=(_GIORNI[k] - base.weekday()) % 7 or 7)
    if re.search(r"settimana prossima|next week", t):
        return base + datetime.timedelta(days=7 - base.weekday())
    if re.search(r"fine (del )?mese|end of (the )?month", t):
        primo = (base.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
        return primo - datetime.timedelta(days=1)
    return None


def ora_da_testo(testo):
    """"ore 15:30", "alle 15", "15.30", "3pm" -> "15:30" ("" se non c'e')."""
    t = (testo or "").lower()
    m = re.search(r"\b([01]?\d|2[0-3])[:.]([0-5]\d)\b\s*(am|pm|a\.m\.|p\.m\.)?", t)
    if m and not re.search(r"\b\d{1,2}[.]\d{1,2}[.]\d{2,4}\b", t):
        h = int(m.group(1))
        if m.group(3) and m.group(3).startswith("p") and h < 12:
            h += 12
        elif m.group(3) and m.group(3).startswith("a") and h == 12:
            h = 0
        return f"{h:02d}:{m.group(2)}"
    m = re.search(r"\b(?:ore|alle|at)\s+([01]?\d|2[0-3])\b", t)
    if m:
        return f"{int(m.group(1)):02d}:00"
    m = re.search(r"\b(1[0-2]|[1-9])\s*(am|pm)\b", t)
    if m:
        h = int(m.group(1)) % 12 + (12 if m.group(2) == "pm" else 0)
        return f"{h:02d}:00"
    return ""


# --------------------------------------------------------------------------- testo semplice (email, Slack, Teams)

def testo_semplice(doc, breve=False, markdown=False):
    L = doc["lingua"]
    b = (lambda s: f"*{s}*") if markdown else (lambda s: s.upper())
    righe = []
    for s in doc["sezioni"]:
        if breve and s.get("livello") == 2:
            continue
        if breve and s["titolo"] == tr("vb_discussi", L):
            continue
        if s["titolo"]:
            righe.append(b(s["titolo"]))
        if s["testo"]:
            righe.append(s["testo"])
        for i, p in enumerate(s["punti"], 1):
            righe.append(f"{i}. {p}" if s["numerati"] else f"• {p}")
        for p in s["aggiunte"]:
            righe.append(f"• {p} ({tr('cd_aggiunto', L)})")
        if s["tabella"]:
            for r in s["tabella"]["righe"]:
                righe.append("• " + " – ".join(x for x in r if x))
        righe.append("")
        if breve and doc["formato"] not in ("verbale",) and len(righe) > 30:
            break
    return "\n".join(righe).strip()


def testo_email(doc):
    L = doc["lingua"]
    if doc["formato"] == "verbale":
        intro = tr("cd_mail_intro_vb", L, data=doc["data"].strftime("%d/%m"))
        corpo = testo_semplice(doc, breve=True)
    else:
        intro = tr("cd_mail_intro", L, nome=doc["titolo"])
        corpo = (doc["breve"] or "").strip()
    return f"{tr('cd_mail_ciao', L)}\n\n{intro}\n\n{corpo}\n\n{tr('cd_mail_allegato', L)}\n\n{tr('cd_mail_firma', L)}".strip()


def oggetto_email(doc):
    L = doc["lingua"]
    q = doc["data"].strftime("%d/%m")
    chiave = "cd_ogg_vb" if doc["formato"] == "verbale" else "cd_ogg"
    return tr(chiave, L, nome=doc["titolo"], data=q)


# --------------------------------------------------------------------------- file

def nome_file(doc, est):
    L = doc["lingua"]
    pre = tr("file_appunti" if doc["formato"] == "cornell" else f"file_appunti_{doc['formato']}", L)
    return f"{pre} – {el.nome_sicuro(doc['titolo'])} – {doc['data']:%d-%m-%Y}.{est}"


def _x(s):
    return html.escape(str(s or ""), quote=False)


def crea_docx(doc, dest):
    """Un file Word semplice ma vero: titoli (si vedono nel riquadro di spostamento), elenchi, tabella."""
    L = doc["lingua"]

    def run(t, b=False, i=False, colore=None, size=None):
        pr = ""
        if b:
            pr += "<w:b/>"
        if i:
            pr += "<w:i/>"
        if colore:
            pr += f'<w:color w:val="{colore}"/>'
        if size:
            pr += f'<w:sz w:val="{size}"/>'
        return f'<w:r>{f"<w:rPr>{pr}</w:rPr>" if pr else ""}<w:t xml:space="preserve">{_x(t)}</w:t></w:r>'

    def par(runs, stile=None, rientro=None):
        pp = ""
        if stile:
            pp += f'<w:pStyle w:val="{stile}"/>'
        if rientro:
            pp += f'<w:ind w:left="{rientro}" w:hanging="280"/>'
        return f'<w:p>{f"<w:pPr>{pp}</w:pPr>" if pp else ""}{runs}</w:p>'

    corpo = [par(run(doc["titolo"]), "Title"), par(run(doc["sottotitolo"], colore="64748B"))]
    for s in doc["sezioni"]:
        if s["titolo"]:
            corpo.append(par(run(s["titolo"]), "Heading2" if s.get("livello") == 2 else "Heading1"))
        if s["testo"]:
            corpo.append(par(run(s["testo"])))
        for i, p in enumerate(s["punti"], 1):
            corpo.append(par(run(f"{i}.\t" if s["numerati"] else "•\t") + run(p), rientro=560))
        for p in s["aggiunte"]:
            corpo.append(par(run("•\t") + run(p, colore="7C3AED") + run(f"  ({tr('cd_aggiunto', L)})", i=True, colore="7C3AED", size=18), rientro=560))
        if s["tabella"]:
            t = s["tabella"]
            n = len(t["teste"])
            larg = [9000 // n] * n if n != 3 else [5200, 2200, 1600]
            bordi = "".join(f'<w:{b} w:val="single" w:sz="4" w:color="CBD5E1"/>' for b in ("top", "left", "bottom", "right", "insideH", "insideV"))
            righe = []
            griglia = "".join('<w:gridCol w:w="%d"/>' % w for w in larg)
            if any(t["teste"]):
                righe.append("<w:tr>" + "".join(f'<w:tc><w:tcPr><w:tcW w:w="{w}" w:type="dxa"/><w:shd w:val="clear" w:fill="F1F5F9"/></w:tcPr>{par(run(h, b=True))}</w:tc>'
                                                 for h, w in zip(t["teste"], larg)) + "</w:tr>")
            for r in t["righe"]:
                righe.append("<w:tr>" + "".join(f'<w:tc><w:tcPr><w:tcW w:w="{w}" w:type="dxa"/></w:tcPr>{par(run(c))}</w:tc>' for c, w in zip(r, larg)) + "</w:tr>")
            corpo.append(f'<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>{bordi}</w:tblBorders></w:tblPr>'
                         f'<w:tblGrid>{griglia}</w:tblGrid>{"".join(righe)}</w:tbl>')
            corpo.append(par(""))
    corpo.append(par(run(tr("pdf_creato", L), i=True, colore="94A3B8", size=16)))
    ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    documento = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {ns}><w:body>{"".join(corpo)}'
                 '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" '
                 'w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>')

    def stile(id_, nome, size, colore, prima, dopo, b=True):
        livello = {"Heading1": '<w:outlineLvl w:val="0"/>', "Heading2": '<w:outlineLvl w:val="1"/>'}.get(id_, "")
        return (f'<w:style w:type="paragraph" w:styleId="{id_}"><w:name w:val="{nome}"/><w:basedOn w:val="Normal"/>'
                f'<w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="{prima}" w:after="{dopo}"/>'
                f'{livello}</w:pPr>'
                f'<w:rPr>{"<w:b/>" if b else ""}<w:color w:val="{colore}"/><w:sz w:val="{size}"/></w:rPr></w:style>')
    stili = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles {ns}>'
             '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/>'
             '<w:sz w:val="22"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/>'
             '</w:pPr></w:pPrDefault></w:docDefaults>'
             '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
             + stile("Title", "Title", 40, "0F1B2D", 0, 60) + stile("Heading1", "heading 1", 26, "C2410C", 280, 80)
             + stile("Heading2", "heading 2", 23, "0369A1", 200, 60) + '</w:styles>')
    tipi = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>')
    drels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
             '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    ora = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    core = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            f'<dc:title>{_x(doc["titolo"])}</dc:title><dc:creator>Verba Manent IA</dc:creator>'
            f'<dcterms:created xsi:type="dcterms:W3CDTF">{ora}</dcterms:created></cp:coreProperties>')
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", tipi)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", documento)
        z.writestr("word/_rels/document.xml.rels", drels)
        z.writestr("word/styles.xml", stili)
        z.writestr("docProps/core.xml", core)
    os.replace(tmp, dest)
    return dest


def cartella_google_drive():
    """La cartella di Google Drive sul PC (programma «Google Drive»), o None."""
    candidati = []
    if sys.platform == "win32":
        for lettera in string.ascii_uppercase[3:]:
            for nome in ("My Drive", "Il mio Drive", "Mi unidad", "Mon Drive", "Meine Ablage"):
                candidati.append(Path(f"{lettera}:/") / nome)
    casa = Path.home()
    candidati += [casa / "Google Drive" / "My Drive", casa / "Google Drive" / "Il mio Drive", casa / "Google Drive"]
    for c in candidati:
        try:
            if c.is_dir():
                return c
        except OSError:
            continue
    return None


# --------------------------------------------------------------------------- calendario (.ics e Google Calendar)

def _ics_testo(s):
    return str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def eventi(doc, scelte=None):
    """Le cose da fare (tutto il giorno della scadenza) e la prossima riunione (all'ora detta).
    scelte = [{"i": indice o "prossima", "data": "AAAA-MM-GG", "ora": "HH:MM"}] dalla finestra; None = tutte."""
    L = doc["lingua"]
    out = []
    voci = [("a", i, a) for i, a in enumerate(doc["azioni"])]
    if doc["prossima"]:
        voci.append(("p", "prossima", doc["prossima"]))
    sc = {str(s.get("i")): s for s in scelte} if scelte is not None else None
    for tipo, i, v in voci:
        s = sc.get(str(i)) if sc is not None else {}
        if sc is not None and s is None:
            continue
        data = (s or {}).get("data") or v.get("data")
        if not data:
            continue
        if tipo == "a":
            titolo = tr("cd_cal_fare", L, cosa=v["cosa"]) + (f" ({v['chi']})" if v["chi"] else "")
            out.append({"titolo": titolo, "data": data, "ora": "", "note": tr("cd_cal_da", L, nome=doc["titolo"]) + (f"\n{tr('vb_entro', L)}: {v['entro']}" if v["entro"] else "")})
        else:
            out.append({"titolo": tr("cd_cal_prossima", L, nome=doc["titolo"]), "data": data,
                        "ora": (s or {}).get("ora") or v.get("ora") or "", "note": v.get("note") or ""})
    return out


def crea_ics(ev, dest):
    righe = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Verba Manent IA//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
    adesso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for e in ev:
        d = datetime.date.fromisoformat(e["data"])
        righe += ["BEGIN:VEVENT", f"UID:{uuid.uuid4()}@verbamanent", f"DTSTAMP:{adesso}", f"SUMMARY:{_ics_testo(e['titolo'])}"]
        if e["ora"]:
            h, m = (int(x) for x in e["ora"].split(":"))
            inizio = datetime.datetime.combine(d, datetime.time(h, m)).astimezone()
            fine = inizio + datetime.timedelta(hours=1)
            u = datetime.timezone.utc
            righe += [f"DTSTART:{inizio.astimezone(u):%Y%m%dT%H%M%SZ}", f"DTEND:{fine.astimezone(u):%Y%m%dT%H%M%SZ}"]
        else:
            righe += [f"DTSTART;VALUE=DATE:{d:%Y%m%d}", f"DTEND;VALUE=DATE:{d + datetime.timedelta(days=1):%Y%m%d}",
                      "TRANSP:TRANSPARENT"]
        if e["note"]:
            righe.append(f"DESCRIPTION:{_ics_testo(e['note'])}")
        righe += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{_ics_testo(e['titolo'])}",
                  "TRIGGER:-PT15M" if e["ora"] else "TRIGGER:PT9H", "END:VALARM", "END:VEVENT"]
    righe.append("END:VCALENDAR")
    piegate = []
    for r in righe:       # righe al massimo di 75 byte, come vuole lo standard
        b = r.encode("utf-8")
        while len(b) > 74:
            n = 74
            while (b[n] & 0xC0) == 0x80:
                n -= 1
            piegate.append(b[:n].decode("utf-8"))
            b = b" " + b[n:]
        piegate.append(b.decode("utf-8"))
    Path(dest).write_bytes(("\r\n".join(piegate) + "\r\n").encode("utf-8"))
    return Path(dest)


def link_google_calendar(e):
    d = datetime.date.fromisoformat(e["data"])
    if e["ora"]:
        h, m = (int(x) for x in e["ora"].split(":"))
        a = datetime.datetime.combine(d, datetime.time(h, m))
        date = f"{a:%Y%m%dT%H%M%S}/{a + datetime.timedelta(hours=1):%Y%m%dT%H%M%S}"
    else:
        date = f"{d:%Y%m%d}/{d + datetime.timedelta(days=1):%Y%m%d}"
    q = {"action": "TEMPLATE", "text": e["titolo"], "dates": date, "details": e["note"]}
    return "https://calendar.google.com/calendar/render?" + urllib.parse.urlencode(q)


# --------------------------------------------------------------------------- email

def crea_eml(doc, destinatari, oggetto, testo, dest, allegati):
    """Email pronta (bozza): Outlook e Posta di Windows la aprono da modificare e inviare."""
    m = email.message.EmailMessage()
    m["To"] = ", ".join(destinatari)
    m["Subject"] = oggetto
    m["Date"] = email.utils.formatdate(localtime=True)
    m["X-Unsent"] = "1"
    m.set_content(testo)
    for a in allegati:
        a = Path(a)
        if not a.exists():
            continue
        tipo = mimetypes.guess_type(a.name)[0] or "application/octet-stream"
        if a.suffix.lower() == ".ics":
            tipo = "text/calendar"
        p, s = tipo.split("/", 1)
        m.add_attachment(a.read_bytes(), maintype=p, subtype=s, filename=a.name)
    Path(dest).write_bytes(bytes(m))
    return Path(dest)


def link_gmail(destinatari, oggetto, testo):
    q = {"view": "cm", "fs": "1", "to": ",".join(destinatari), "su": oggetto, "body": testo[:1800]}
    return "https://mail.google.com/mail/?" + urllib.parse.urlencode(q, quote_via=urllib.parse.quote)


# --------------------------------------------------------------------------- Slack, Teams, Notion, CRM

def _post(url, dati, intestazioni=None, metodo="POST", timeout=30):
    corpo = json.dumps(dati).encode("utf-8") if dati is not None else None
    h = {"Content-Type": "application/json", "User-Agent": "VerbaManentIA"}
    h.update(intestazioni or {})
    req = urllib.request.Request(url, data=corpo, headers=h, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            b = r.read()
            try:
                return json.loads(b.decode("utf-8") or "null")
            except ValueError:
                return b.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        corpo = e.read().decode("utf-8", "replace")[:400]
        log.warning("%s %s: %s", metodo, url.split("?")[0][:60], corpo)
        if e.code in (401, 403):
            raise ErroreCondividi(tr("cd_err_chiave"))
        if e.code == 404:
            raise ErroreCondividi(tr("cd_err_indirizzo"))
        raise ErroreCondividi(tr("cd_err_servizio", codice=e.code))
    except (urllib.error.URLError, OSError):
        raise ErroreCondividi(tr("cd_err_rete"))


def messaggio_breve(doc, markdown=True):
    L = doc["lingua"]
    testa = ("📋 " if doc["formato"] == "verbale" else "📝 ") + doc["titolo"]
    corpo = testo_semplice(doc, breve=True, markdown=markdown)
    if len(corpo) > 2800:
        corpo = corpo[:2800].rsplit("\n", 1)[0] + "\n…"
    return testa, doc["sottotitolo"], corpo + f"\n\n_{tr('pdf_creato', L)}_"


def invia_slack(url, doc=None, prova=False):
    if not re.match(r"^https://hooks\.slack\.com/", url or ""):
        raise ErroreCondividi(tr("cd_err_slack"))
    if prova:
        _post(url, {"text": tr("cd_prova_msg")})
        return
    t, s, c = messaggio_breve(doc)
    _post(url, {"text": f"*{t}*\n{s}\n\n{c}"})


def invia_teams(url, doc=None, prova=False):
    if not re.match(r"^https://[\w.-]+\.(logic\.azure\.com|office\.com|webhook\.office\.com|powerplatform\.com|"
                    r"environment\.api\.powerplatform\.com)", url or "") and "workflows" not in (url or "") and "webhook" not in (url or ""):
        raise ErroreCondividi(tr("cd_err_teams"))
    if prova:
        corpo = [{"type": "TextBlock", "text": tr("cd_prova_msg"), "wrap": True}]
    else:
        t, s, c = messaggio_breve(doc, markdown=False)
        corpo = [{"type": "TextBlock", "text": t, "weight": "Bolder", "size": "Medium", "wrap": True},
                 {"type": "TextBlock", "text": s, "isSubtle": True, "spacing": "None", "wrap": True},
                 {"type": "TextBlock", "text": c.replace("\n", "\n\n"), "wrap": True}]
    _post(url, {"type": "message", "attachments": [{"contentType": "application/vnd.microsoft.card.adaptive", "contentUrl": None,
                                                     "content": {"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                                                                 "type": "AdaptiveCard", "version": "1.4", "body": corpo}}]})


NOTION = "https://api.notion.com/v1"


def id_notion(link):
    m = re.findall(r"([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", (link or "").lower().split("?")[0])
    return m[-1].replace("-", "") if m else ""


def _h_notion(chiave):
    return {"Authorization": f"Bearer {chiave}", "Notion-Version": "2022-06-28"}


def prova_notion(chiave, pagina):
    pid = id_notion(pagina)
    if not pid:
        raise ErroreCondividi(tr("cd_err_notion_link"))
    try:
        d = _post(f"{NOTION}/pages/{pid}", None, _h_notion(chiave), metodo="GET")
    except ErroreCondividi as e:
        if str(e) == tr("cd_err_indirizzo"):
            raise ErroreCondividi(tr("cd_err_notion_pagina"))
        raise
    titolo = ""
    for p in (d or {}).get("properties", {}).values():
        if p.get("type") == "title":
            titolo = "".join(x.get("plain_text", "") for x in p.get("title", []))
    return titolo or "Notion"


def _rt(t, **ann):
    t = str(t or "")
    out = []
    for i in range(0, max(1, len(t)), 1900):
        x = {"type": "text", "text": {"content": t[i:i + 1900]}}
        if ann:
            x["annotations"] = ann
        out.append(x)
    return out


def blocchi_notion(doc):
    L = doc["lingua"]
    B = [{"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rt(doc["sottotitolo"], color="gray")}}]
    for s in doc["sezioni"]:
        if s["titolo"]:
            h = "heading_3" if s.get("livello") == 2 else "heading_2"
            B.append({"object": "block", "type": h, h: {"rich_text": _rt(s["titolo"])}})
        if s["testo"]:
            B.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rt(s["testo"])}})
        tipo = "numbered_list_item" if s["numerati"] else "bulleted_list_item"
        for p in s["punti"]:
            B.append({"object": "block", "type": tipo, tipo: {"rich_text": _rt(p)}})
        for p in s["aggiunte"]:
            B.append({"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {
                "rich_text": _rt(p, color="purple") + _rt(f"  ({tr('cd_aggiunto', L)})", italic=True, color="purple")}})
        if s["tabella"] and s["titolo"] == tr("vb_azioni", L):
            for r in s["tabella"]["righe"]:
                B.append({"object": "block", "type": "to_do", "to_do": {"rich_text": _rt(" – ".join(x for x in r if x)), "checked": False}})
        elif s["tabella"]:
            for r in s["tabella"]["righe"]:
                B.append({"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": _rt(" – ".join(x for x in r if x))}})
    return B


def invia_notion(chiave, pagina, doc):
    pid = id_notion(pagina)
    B = blocchi_notion(doc)
    titolo = f"{doc['titolo']} – {doc['data']:%d/%m/%Y}"
    p = _post(f"{NOTION}/pages", {"parent": {"page_id": pid}, "icon": {"type": "emoji", "emoji": "📋" if doc["formato"] == "verbale" else "📝"},
                                  "properties": {"title": {"title": _rt(titolo)}}, "children": B[:100]}, _h_notion(chiave))
    nuova = (p or {}).get("id")
    for i in range(100, len(B), 100):
        _post(f"{NOTION}/blocks/{nuova}/children", {"children": B[i:i + 100]}, _h_notion(chiave), metodo="PATCH")
    return (p or {}).get("url", "")


HUBSPOT = "https://api.hubapi.com"


def prova_hubspot(chiave):
    _post(f"{HUBSPOT}/crm/v3/objects/contacts?limit=1", None, {"Authorization": f"Bearer {chiave}"}, metodo="GET")


def invia_hubspot(chiave, doc, emails):
    """Una nota nella scheda di ogni contatto (cercato per email) che ha partecipato."""
    h = {"Authorization": f"Bearer {chiave}"}
    ids = []
    for em in emails:
        r = _post(f"{HUBSPOT}/crm/v3/objects/contacts/search", {"filterGroups": [{"filters": [
            {"propertyName": "email", "operator": "EQ", "value": em}]}], "limit": 1}, h)
        ids += [x["id"] for x in (r or {}).get("results", [])]
    if not ids:
        raise ErroreCondividi(tr("cd_err_hubspot_nessuno"))
    t, s, c = messaggio_breve(doc, markdown=False)
    corpo = f"<b>{_x(t)}</b><br>{_x(s)}<br><br>" + _x(c).replace("\n", "<br>")
    _post(f"{HUBSPOT}/crm/v3/objects/notes", {
        "properties": {"hs_timestamp": doc["data"].astimezone().isoformat(), "hs_note_body": corpo},
        "associations": [{"to": {"id": i}, "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 202}]} for i in ids]}, h)
    return len(ids)


def invia_webhook(url, doc=None, rubrica=None, prova=False):
    """Per Zapier, Make, n8n... (e da li' Salesforce, Pipedrive, Zoho...): tutto il verbale in JSON."""
    if not re.match(r"^https://", url or ""):
        raise ErroreCondividi(tr("cd_err_indirizzo"))
    if prova:
        _post(url, {"prova": True, "messaggio": tr("cd_prova_msg")})
        return
    t, s, c = messaggio_breve(doc, markdown=False)
    _post(url, {"titolo": doc["titolo"], "data": doc["data"].isoformat(), "formato": doc["formato"], "tipo": doc["tipo"],
                "partecipanti": [{"nome": p, "email": (rubrica or {}).get(p, "")} for p in doc["partecipanti"]],
                "in_breve": doc["breve"], "cose_da_fare": doc["azioni"], "prossima_riunione": doc["prossima"],
                "testo": testo_semplice(doc), "riassunto": c})
