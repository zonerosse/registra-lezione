# -*- coding: utf-8 -*-
"""
Calendario: gli impegni dei prossimi giorni, da
  - Google Calendar, Outlook / Microsoft 365 o qualsiasi calendario con un indirizzo ICS ("indirizzo segreto in
    formato iCal" di Google, "Pubblica calendario" di Outlook): niente password, solo il link;
  - l'orario delle lezioni scritto a mano (giorno della settimana, dalle, alle, materia).
Il motore li guarda ogni mezzo minuto: due minuti prima avvisa (o registra da solo) e a fine impegno chiede
se fermare la registrazione.
"""
import datetime
import hashlib
import logging
import re
import ssl
import sys
import time
import urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent
log = logging.getLogger("registra_lezione")

GIORNI_AVANTI = 7
LINK = re.compile(r"https?://(?:[\w-]+\.)*(?:meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|zoom\.us|"
                  r"webex\.com|whereby\.com|meet\.jit\.si|gotomeeting\.com|bluejeans\.com)[^\s\"'<>\\]*", re.I)


def _vendor():
    v = str(QUI / "_vendor")
    if v not in sys.path:
        sys.path.append(v)          # in fondo: se il programma ha gia' una libreria, usa quella


def scarica(url, timeout=30):
    """Il file ICS del calendario (bytes). webcal:// diventa https://."""
    url = (url or "").strip()
    if url.lower().startswith("webcal://"):
        url = "https://" + url[9:]
    req = urllib.request.Request(url, headers={"User-Agent": "VerbaManentIA"})
    with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
        return r.read()


def nome_fonte(url):
    u = (url or "").lower()
    if "google.com" in u:
        return "Google Calendar"
    if "outlook" in u or "office365" in u or "live.com" in u:
        return "Outlook"
    if "icloud" in u:
        return "iCloud"
    return "Calendario"


def _ora_locale(x):
    """date/datetime -> datetime locale (con fuso); None per gli impegni di tutta la giornata."""
    if not isinstance(x, datetime.datetime):
        return None
    if x.tzinfo is None:
        return x.astimezone()
    return x.astimezone()


def link_riunione(*testi):
    for t in testi:
        m = LINK.search(str(t or ""))
        if m:
            return m.group(0).rstrip(").,;")
    return ""


def _partecipanti(ev):
    out = []
    att = ev.get("ATTENDEE")
    if att is None:
        return out
    for a in (att if isinstance(att, list) else [att]):
        cn = ""
        try:
            cn = str(a.params.get("CN") or "")
        except Exception:
            pass
        if not cn:
            cn = str(a).split(":", 1)[-1].split("@")[0]
        cn = cn.strip().strip('"')
        if cn and cn not in out:
            out.append(cn)
    return out[:30]


def impegni_ics(dati, fonte, dalle, alle):
    """Gli impegni (anche quelli che si ripetono) fra dalle e alle."""
    _vendor()
    import icalendar
    import recurring_ical_events
    cal = icalendar.Calendar.from_ical(dati)
    out = []
    for ev in recurring_ical_events.of(cal).between(dalle, alle):
        inizio, fine = _ora_locale(ev.get("DTSTART").dt), None
        if inizio is None:          # tutta la giornata: non e' una lezione o una riunione da registrare
            continue
        if ev.get("DTEND") is not None:
            fine = _ora_locale(ev.get("DTEND").dt)
        elif ev.get("DURATION") is not None:
            fine = inizio + ev.get("DURATION").dt
        fine = fine or inizio + datetime.timedelta(hours=1)
        if str(ev.get("STATUS") or "").upper() == "CANCELLED":
            continue
        uid = str(ev.get("UID") or "")
        titolo = str(ev.get("SUMMARY") or "").strip() or "Impegno"
        luogo = str(ev.get("LOCATION") or "")
        link = link_riunione(ev.get("X-GOOGLE-CONFERENCE"), luogo, ev.get("URL"), ev.get("DESCRIPTION"))
        out.append({"id": hashlib.sha1(f"{uid}|{inizio.isoformat()}".encode()).hexdigest()[:16],
                    "uid": uid or titolo, "titolo": titolo, "inizio": inizio, "fine": fine, "luogo": luogo[:120],
                    "link": link, "partecipanti": _partecipanti(ev), "fonte": fonte,
                    "aula": not link and bool(luogo)})
    return out


def impegni_orario(orario, dalle, alle):
    """L'orario delle lezioni: [{"giorno": 0-6 (lunedi'=0), "dalle": "10:00", "alle": "12:00", "nome", "dove", "link"}]."""
    out = []
    giorno = dalle.date()
    while giorno <= alle.date():
        for r in orario or []:
            try:
                if int(r.get("giorno")) != giorno.weekday():
                    continue
                h1, m1 = (int(x) for x in str(r.get("dalle")).split(":")[:2])
                h2, m2 = (int(x) for x in str(r.get("alle")).split(":")[:2])
            except (TypeError, ValueError):
                continue
            inizio = datetime.datetime.combine(giorno, datetime.time(h1, m1)).astimezone()
            fine = datetime.datetime.combine(giorno, datetime.time(h2, m2)).astimezone()
            if fine <= inizio:
                fine = inizio + datetime.timedelta(hours=1)
            if fine < dalle or inizio > alle:
                continue
            nome = str(r.get("nome") or "").strip() or "Lezione"
            out.append({"id": hashlib.sha1(f"orario|{nome}|{inizio.isoformat()}".encode()).hexdigest()[:16],
                        "uid": f"orario|{nome}|{r.get('giorno')}|{r.get('dalle')}", "titolo": nome,
                        "inizio": inizio, "fine": fine, "luogo": "", "link": str(r.get("link") or ""),
                        "partecipanti": [], "fonte": "orario", "aula": r.get("dove") == "aula", "lezione": True})
        giorno += datetime.timedelta(days=1)
    return out


class Calendari:
    """Tiene i calendari scaricati (si riscaricano ogni 15 minuti) e calcola gli impegni."""

    def __init__(self, cartella_cache):
        self.cache = Path(cartella_cache)
        self.dati = {}          # url -> (bytes, ora)
        self.errori = {}        # url -> testo

    def aggiorna(self, fonti, forza=False):
        for f in fonti or []:
            url = f.get("url", "")
            ora = time.time()
            if not forza and url in self.dati and ora - self.dati[url][1] < 900:
                continue
            try:
                b = scarica(url)
                if b"BEGIN:VCALENDAR" not in b[:2000].upper():
                    raise ValueError("non e' un calendario")
                self.dati[url] = (b, ora)
                self.errori.pop(url, None)
                try:
                    self.cache.mkdir(parents=True, exist_ok=True)
                    (self.cache / (hashlib.sha1(url.encode()).hexdigest()[:12] + ".ics")).write_bytes(b)
                except OSError:
                    pass
            except Exception as e:
                log.warning("calendario %s: %s", nome_fonte(url), e)
                self.errori[url] = str(e)[:200]
                if url not in self.dati:            # senza internet uso l'ultima copia
                    p = self.cache / (hashlib.sha1(url.encode()).hexdigest()[:12] + ".ics")
                    if p.exists():
                        self.dati[url] = (p.read_bytes(), ora - 600)

    def impegni(self, fonti, orario, giorni=GIORNI_AVANTI):
        adesso = datetime.datetime.now().astimezone()
        dalle, alle = adesso - datetime.timedelta(hours=4), adesso + datetime.timedelta(days=giorni)
        out = impegni_orario(orario, dalle, alle)
        for f in fonti or []:
            d = self.dati.get(f.get("url", ""))
            if not d:
                continue
            try:
                out += impegni_ics(d[0], f.get("nome") or nome_fonte(f.get("url")), dalle, alle)
            except Exception:
                log.exception("lettura calendario")
        out = [e for e in out if e["fine"] > adesso - datetime.timedelta(minutes=5)]
        return sorted(out, key=lambda e: e["inizio"])
