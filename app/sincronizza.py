# -*- coding: utf-8 -*-
"""
Sincronizzazione fra PC e telefono (e altri PC) sulla stessa rete Wi-Fi (o sull'hotspot del telefono).

Il PC fa da «centro»: un piccolo server sulla rete locale (porta 47320) e una risposta ai messaggi di ricerca
(UDP 47321). Il telefono, o un altro PC, si collega una volta con un codice di 6 cifre e poi, ogni minuto,
cerca il centro e si scambia i file. Niente internet, niente account.

Cosa si scambia: le cartelle delle lezioni pronte e la cartella «esami» (materie: date d'esame, test, glossario,
libro di testo letto…), piu' i PDF degli appunti e un «profilo» con il ripasso fatto (giorni di fila, strumenti
usati…). I video no, se non si sceglie (al loro posto il centro prepara l'audio della lezione, audio.m4a).

Regole: un file che c'e' da una parte sola si copia; se e' diverso da tutte e due le parti vince il piu' recente;
alcuni file si UNISCONO invece (ripasso.json, i file delle materie, foto/scritti, il profilo) cosi' non si perde
lo studio fatto su due dispositivi. Le lezioni eliminate su un dispositivo si eliminano anche sull'altro.
"""
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import elaborazione as el

log = logging.getLogger("registra_lezione")

PORTA = 47320
PORTA_UDP = 47321
VIDEO = {".mp4", ".mkv", ".webm", ".avi", ".mov"}
SALTA = {".tmp", ".part", ".lock", ".vmtmp"}
STUDIO = {"ripasso.json", "crocette.json"}
PAC = ".pac/"            # i PDF degli appunti (stanno fuori dalla cartella delle registrazioni)
PROFILO = ".vm/profilo.json"
CESTINO = None           # il motore mette qui al_cestino: le lezioni eliminate altrove vanno nel Cestino


# --------------------------------------------------------------------------- elenco dei file

class Firme:
    """sha1 dei file, ricordate per (dimensione, data): non si rilegge ogni minuto tutto il disco."""

    def __init__(self, base):
        self.f = Path(base) / ".vm" / "firme.json"
        self.d = el.leggi_json(self.f, {}) or {}
        self.cambiate = False

    def di(self, p, rel):
        st = p.stat()
        k = f"{st.st_size}:{st.st_mtime_ns}"
        x = self.d.get(rel)
        if x and x[0] == k:
            return x[1]
        if rel.endswith("info.json"):
            f = _firma_info(p)
        else:
            h = hashlib.sha1()
            with open(p, "rb") as fh:
                for b in iter(lambda: fh.read(1 << 20), b""):
                    h.update(b)
            f = h.hexdigest()[:20]
        self.d[rel] = [k, f]
        self.cambiate = True
        return f

    def salva(self):
        if self.cambiate:
            self.f.parent.mkdir(exist_ok=True)
            el.scrivi_json(self.f, self.d)
            self.cambiate = False


def _senza_percorsi(x):
    """info.json con i percorsi dei PDF ridotti al solo nome (ogni dispositivo ha le sue cartelle)."""
    if isinstance(x, dict):
        return {k: _senza_percorsi(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_senza_percorsi(v) for v in x]
    if isinstance(x, str) and ("/" in x or "\\" in x) and re.search(r"\.(pdf|zip|html)$", x, re.I):
        return "@" + re.split(r"[\\/]", x)[-1]
    return x


def _firma_info(p):
    d = el.leggi_json(p, {}) or {}
    return hashlib.sha1(json.dumps(_senza_percorsi(d), sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:20]


def _pdf_di(info):
    """I PDF degli appunti nominati in info.json."""
    out = []

    def giro(x):
        if isinstance(x, dict):
            for v in x.values():
                giro(v)
        elif isinstance(x, list):
            for v in x:
                giro(v)
        elif isinstance(x, str) and re.search(r"\.pdf$", x, re.I) and ("/" in x or "\\" in x):
            out.append(x)
    giro(info)
    return out


def elenco(base, pacchetti, opzioni, firme):
    """{percorso relativo: {"s": byte, "m": data, "f": firma}} di quello che si sincronizza."""
    base = Path(base)
    out = {}

    def metti(p, rel):
        try:
            st = p.stat()
            out[rel] = {"s": st.st_size, "m": round(st.st_mtime, 3), "f": firme.di(p, rel)}
        except OSError:
            pass
    video = bool(opzioni.get("video"))
    try:
        cartelle = [c for c in base.iterdir() if c.is_dir() and not c.name.startswith(".")]
    except OSError:
        cartelle = []
    for c in cartelle:
        if c.name == "esami":
            for p in c.rglob("*"):
                if not p.is_file() or p.suffix.lower() in SALTA or p.name == "indice.json":
                    continue
                libro = p.parent != c
                if (libro and not opzioni.get("libro", True)) or (not libro and not opzioni.get("materie", True)):
                    continue
                metti(p, p.relative_to(base).as_posix())
            continue
        info = el.leggi_json(c / "info.json", {}) or {}
        if info.get("stato") != "pronta" or not opzioni.get("lezioni", True):
            continue
        for p in c.rglob("*"):
            if not p.is_file():
                continue
            suf = p.suffix.lower()
            if suf in SALTA or p.name.startswith("audio_") and suf == ".wav" or (suf in VIDEO and not video) \
                    or p.parent.name == "rumore" or (p.name in STUDIO and not opzioni.get("studio", True)):
                continue
            metti(p, p.relative_to(base).as_posix())
        for pdf in _pdf_di(info):
            pp = Path(pdf)
            if re.split(r"[\\/]", pdf)[-2:-1] == [c.name]:
                continue                      # sta nella cartella della lezione: c'e' gia'
            if not pp.exists():
                pp = Path(pacchetti) / Path(pdf.replace("\\", "/")).name
            if pp.exists():
                metti(pp, PAC + pp.name)
    return out


# --------------------------------------------------------------------------- unire i file che si possono unire

def _per(lista, chiave):
    return {str(x.get(chiave)): x for x in lista or [] if isinstance(x, dict) and x.get(chiave)}


def unisci(rel, mio, altro, mio_nuovo=True):
    """Torna il contenuto unito (dict/list) o None se il file non si unisce (vince il piu' recente)."""
    nome = rel.rsplit("/", 1)[-1]
    if nome == "ripasso.json" and isinstance(mio, dict) and isinstance(altro, dict):
        out = dict(altro)
        for k, v in mio.items():
            w = out.get(k)
            if not isinstance(w, dict) or str(v.get("quando", "")) >= str(w.get("quando", "")):
                out[k] = v
        return out
    if nome in ("foto.json", "scritti.json") and isinstance(mio, list) and isinstance(altro, list):
        a, b = _per(altro, "file"), _per(mio, "file")
        for k, v in b.items():
            if k not in a or (v.get("testo") and len(str(v.get("testo"))) >= len(str(a[k].get("testo") or ""))):
                a[k] = v
        return sorted(a.values(), key=lambda x: str(x.get("file")))
    if _materia(rel) and isinstance(mio, dict) and isinstance(altro, dict):
        out = {**altro, **mio} if mio_nuovo else {**mio, **altro}
        for k in ("test", "orali", "simulazioni"):
            u = {**_per(altro.get(k), "quando"), **_per(mio.get(k), "quando")}
            if u:
                out[k] = sorted(u.values(), key=lambda x: str(x.get("quando")))
        if out.get("test"):
            out["voti_test"] = [t["voto"] for t in out["test"] if t.get("voto") is not None]
        return out
    if rel == PROFILO and isinstance(mio, dict) and isinstance(altro, dict):
        out = dict(altro)
        for k in ("rg_fatti", "libro_no", "materie_recenti", "eliminate"):
            out[k] = sorted(set(mio.get(k) or []) | set(altro.get(k) or []))
        out["dsa_usati"] = {**(altro.get("dsa_usati") or {}), **(mio.get("dsa_usati") or {})}
        tf = {}
        for d in (altro.get("tutor_fatti") or {}, mio.get("tutor_fatti") or {}):
            for g, v in d.items():
                tf[g] = sorted(set(tf.get(g, [])) | set(v or []))
        out["tutor_fatti"] = tf
        for k in ("nome_classe", "rg_max", "rg_modo", "lettura"):
            if mio.get(k) and (str(mio.get("_agg", "")) >= str(altro.get("_agg", "")) or not altro.get(k)):
                out[k] = mio[k]
        out["_agg"] = max(str(mio.get("_agg", "")), str(altro.get("_agg", "")))
        return out
    return None


# il profilo: la parte delle impostazioni che segue lo studente
CHIAVI_PROFILO = ("rg_fatti", "dsa_usati", "tutor_fatti", "nome_classe", "libro_no", "materie_recenti", "rg_max", "rg_modo", "lettura")


def scrivi_profilo(base, cfg, studio=True):
    d = {k: cfg.get(k) for k in CHIAVI_PROFILO if cfg.get(k) is not None} if studio else {}
    d["eliminate"] = cfg.get("sync_eliminate") or []
    f = Path(base) / PROFILO
    vecchio = el.leggi_json(f, None)
    if vecchio is None or {k: v for k, v in vecchio.items() if k != "_agg"} != json.loads(json.dumps(d)):
        d["_agg"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        f.parent.mkdir(exist_ok=True)
        el.scrivi_json(f, d)


def leggi_profilo(base, cfg, studio=True):
    """Il profilo unito torna nelle impostazioni; le lezioni eliminate altrove si tolgono qui."""
    d = el.leggi_json(Path(base) / PROFILO, {}) or {}
    for k in CHIAVI_PROFILO if studio else ():
        if d.get(k) is not None:
            cfg[k] = d[k]
    elim = d.get("eliminate") or []
    cfg["sync_eliminate"] = elim
    tolte = 0
    for nome in elim:
        c = Path(base) / nome
        if c.is_dir() and nome not in ("esami", ".vm") and "/" not in nome and "\\" not in nome and nome not in (".", ".."):
            try:
                CESTINO([c]) if CESTINO else shutil.rmtree(c)
            except Exception:
                shutil.rmtree(c, ignore_errors=True)
            tolte += 1
    return tolte


# --------------------------------------------------------------------------- scrivere un file arrivato

def _dove(base, pacchetti, rel):
    if rel.startswith(PAC):
        return Path(pacchetti) / rel[len(PAC):]
    p = (Path(base) / rel).resolve()
    if not str(p).startswith(str(Path(base).resolve())):
        raise ValueError("percorso non valido")
    return p


def _ripara_info(dati, pacchetti, lezione):
    """I percorsi dei PDF in info.json portati nelle cartelle di questo dispositivo (quella della lezione o dei pacchetti)."""
    if isinstance(dati, dict):
        return {k: _ripara_info(v, pacchetti, lezione) for k, v in dati.items()}
    if isinstance(dati, list):
        return [_ripara_info(v, pacchetti, lezione) for v in dati]
    if isinstance(dati, str) and re.search(r"\.pdf$", dati, re.I) and ("/" in dati or "\\" in dati):
        parti = re.split(r"[\\/]", dati)
        return str((Path(lezione) if parti[-2:-1] == [Path(lezione).name] else Path(pacchetti)) / parti[-1])
    return dati


def scrivi(base, pacchetti, rel, contenuto, mtime=None, n=None):
    """contenuto: byte, oppure un file aperto da cui leggere n byte (i video: senza tenerli tutti in memoria)."""
    dest = _dove(base, pacchetti, rel)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not isinstance(contenuto, (bytes, bytearray)) and (rel.endswith(".json") or (n or 0) < (8 << 20)):
        contenuto = contenuto.read(n) if n is not None else contenuto.read()
    if rel.endswith("info.json"):
        try:
            contenuto = json.dumps(_ripara_info(json.loads(contenuto.decode("utf-8")), pacchetti, dest.parent),
                                   ensure_ascii=False, indent=1).encode("utf-8")
        except Exception:
            pass
    tmp = dest.with_name(dest.name + f".{os.getpid()}.{threading.get_ident()}.tmp")
    if isinstance(contenuto, (bytes, bytearray)):
        tmp.write_bytes(contenuto)
    else:
        resto = n
        with open(tmp, "wb") as fh:
            while resto is None or resto > 0:
                b = contenuto.read(1 << 20 if resto is None else min(1 << 20, resto))
                if not b:
                    break
                fh.write(b)
                if resto is not None:
                    resto -= len(b)
        if resto:
            tmp.unlink(missing_ok=True)
            raise IOError("file incompleto")
    os.replace(tmp, dest)
    if mtime:
        try:
            os.utime(dest, (mtime, mtime))
        except OSError:
            pass


# --------------------------------------------------------------------------- il centro (sul PC)

def _io_ip():
    """Gli indirizzi di questo dispositivo sulla rete locale (prima quello della rete principale)."""
    out = set()
    primo = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        primo = s.getsockname()[0]
        s.close()
    except OSError:
        pass
    try:
        for x in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            out.add(x[4][0])
    except OSError:
        pass
    altri = sorted(ip for ip in out if not ip.startswith("127.") and ip != primo)
    return ([primo] if primo and not primo.startswith("127.") else []) + altri[:3]


class Centro:
    """Server sulla rete locale: abbinamento con codice, elenco, file, unione. E la risposta alla ricerca UDP."""

    def __init__(self, motore):
        self.m = motore
        self.http = None
        self.udp = None
        self.codice = None
        self.codice_fino = 0
        self.attivo = False

    @property
    def id(self):
        if not self.m.cfg.get("sync_id"):
            self.m.cfg["sync_id"] = secrets.token_hex(6)
            self.m.salva_cfg()
        return self.m.cfg["sync_id"]

    def avvia(self):
        if self.attivo:
            return True
        centro = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _ok(self, dati, tipo="application/json"):
                b = dati if isinstance(dati, bytes) else json.dumps(dati, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", tipo)
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)

            def _no(self, code=403):
                self.send_response(code)
                self.end_headers()

            def _chi(self):
                tok = self.headers.get("X-VM-Token", "")
                for d in centro.m.cfg.get("sync_dispositivi") or []:
                    if tok and hmac.compare_digest(str(d.get("token")), tok):
                        return d
                return None

            def _corpo(self):
                n = int(self.headers.get("Content-Length") or 0)
                return self.rfile.read(n) if n else b""

            def do_POST(self):
                u = urllib.parse.urlparse(self.path)
                q = dict(urllib.parse.parse_qsl(u.query))
                try:
                    if u.path == "/vm/abbina":
                        d = json.loads(self._corpo() or b"{}")
                        r = centro.abbina(str(d.get("codice", "")), str(d.get("id", "")), str(d.get("nome", "")))
                        return self._ok(r) if r else self._no()
                    chi = self._chi()
                    if not chi:
                        return self._no()
                    if u.path == "/vm/elenco":
                        opz = json.loads(self._corpo() or b"{}")
                        return self._ok(centro.elenco(opz))
                    if u.path == "/vm/manda":
                        centro.ricevi(q["p"], self.rfile, float(q.get("m") or 0), int(self.headers.get("Content-Length") or 0))
                        return self._ok({"ok": True})
                    if u.path == "/vm/unisci":
                        return self._ok(centro.unisci(q["p"], json.loads(self._corpo() or b"null"), float(q.get("m") or 0)))
                    if u.path == "/vm/fine":
                        centro.fine(chi, json.loads(self._corpo() or b"{}"))
                        return self._ok({"ok": True})
                except Exception:
                    log.exception("sincronizza: richiesta %s", u.path)
                    return self._no(500)
                return self._no(404)

            def do_GET(self):
                u = urllib.parse.urlparse(self.path)
                q = dict(urllib.parse.parse_qsl(u.query))
                if u.path == "/vm/ping":
                    return self._ok({"id": centro.id})
                if u.path == "/vm/file" and self._chi():
                    try:
                        p = _dove(centro.m.base(), centro.m.pacchetti(), q["p"])
                        n = p.stat().st_size
                        fh = open(p, "rb")
                    except Exception:
                        return self._no(404)
                    with fh:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/octet-stream")
                        self.send_header("Content-Length", str(n))
                        self.end_headers()
                        shutil.copyfileobj(fh, self.wfile, 1 << 20)
                    return
                return self._no(404)
        try:
            self.http = ThreadingHTTPServer(("0.0.0.0", PORTA), H)
        except OSError:
            log.exception("sincronizza: porta %s occupata", PORTA)
            return False
        threading.Thread(target=self.http.serve_forever, daemon=True).start()
        threading.Thread(target=self._ricerca, daemon=True).start()
        self.attivo = True
        log.info("sincronizza: centro attivo su %s:%s", _io_ip(), PORTA)
        return True

    def _ricerca(self):
        """Risponde a «VMIA?<id>» (cerca il suo centro) e a «VMIA-CODICE?<codice>» (abbinamento)."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(("", PORTA_UDP))
            self.udp = s
        except OSError:
            log.exception("sincronizza: ricerca UDP")
            return
        while True:
            try:
                dati, da = s.recvfrom(256)
                t = dati.decode("utf-8", "ignore")
                if t == f"VMIA?{self.id}" or (t.startswith("VMIA-CODICE?") and self.codice and time.time() < self.codice_fino
                                               and t[12:] == self.codice):
                    s.sendto(f"VMIA!{self.id}:{PORTA}:{self.m.nome_dispositivo()}".encode("utf-8"), da)
            except Exception:
                time.sleep(1)

    def nuovo_codice(self):
        self.codice = f"{secrets.randbelow(10 ** 6):06d}"
        self.codice_fino = time.time() + 600
        return self.codice

    def abbina(self, codice, id_disp, nome):
        if not self.codice or time.time() > self.codice_fino or not hmac.compare_digest(codice, self.codice):
            return None
        tok = secrets.token_hex(16)
        lista = [d for d in self.m.cfg.get("sync_dispositivi") or [] if d.get("id") != id_disp]
        lista.append({"id": id_disp, "nome": nome[:40] or "?", "token": tok, "ultimo": "", "ruolo": "client"})
        self.m.cfg["sync_dispositivi"] = lista
        self.m.salva_cfg()
        self.codice = None
        self.m.sync_evento("abbinato", nome)
        return {"token": tok, "id": self.id, "nome": self.m.nome_dispositivo()}

    def elenco(self, opz):
        base, pac = self.m.base(), self.m.pacchetti()
        scrivi_profilo(base, self.m.cfg)
        if not opz.get("video"):
            self._audio_per_telefono(base)
        f = Firme(base)
        e = elenco(base, pac, opz, f)
        f.salva()
        return {"file": e, "id": self.id, "nome": self.m.nome_dispositivo()}

    def _audio_per_telefono(self, base):
        """Lezioni del PC con solo il video: l'audio (audio.m4a) per chi non prende i video."""
        try:
            ff = el.ffmpeg_exe()
        except Exception:
            return
        for c in Path(base).iterdir():
            v = c / "video.mp4"
            if c.is_dir() and v.exists() and not (c / "audio.m4a").exists():
                try:
                    subprocess.run([ff, "-y", "-nostdin", "-loglevel", "error", "-i", str(v), "-vn", "-c:a", "copy", str(c / "audio.m4a")],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=el.NO_WINDOW, timeout=600)
                except Exception:
                    log.exception("sincronizza: audio di %s", c.name)

    def ricevi(self, rel, contenuto, mtime, n=None):
        scrivi(self.m.base(), self.m.pacchetti(), rel, contenuto, mtime, n)
        if rel == PROFILO:
            leggi_profilo(self.m.base(), self.m.cfg)
            self.m.salva_cfg()

    def unisci(self, rel, suo, suo_m=0):
        p = _dove(self.m.base(), self.m.pacchetti(), rel)
        if rel == PROFILO:
            scrivi_profilo(self.m.base(), self.m.cfg)
        p.parent.mkdir(parents=True, exist_ok=True)
        mio = el.leggi_json(p, None)
        try:
            mio_nuovo = p.stat().st_mtime >= suo_m
        except OSError:
            mio_nuovo = False
        u = unisci(rel, mio, suo, mio_nuovo) if mio is not None else suo
        if u is None:
            u = suo
        el.scrivi_json(p, u)
        if rel == PROFILO:
            leggi_profilo(self.m.base(), self.m.cfg)
            self.m.salva_cfg()
        return u

    def fine(self, chi, stat):
        chi["ultimo"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        self.m.salva_cfg()
        if stat.get("arrivati") or stat.get("mandati"):
            self.m.sync_evento("fatto", chi.get("nome"))


# --------------------------------------------------------------------------- chi si collega al centro (telefono, altro PC)

def cerca(messaggio, ultimo_ip=None, attesa=2.5, id_centro=None):
    """Trova il centro sulla rete: prima l'ultimo indirizzo, poi un messaggio a tutta la rete."""
    if ultimo_ip and id_centro:
        try:
            with urllib.request.urlopen(f"http://{ultimo_ip}:{PORTA}/vm/ping", timeout=1.5) as r:
                if json.loads(r.read()).get("id") == id_centro:
                    return ultimo_ip, None
        except Exception:
            pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.settimeout(attesa)
        for dest in ["255.255.255.255"] + [re.sub(r"\.\d+$", ".255", ip) for ip in _io_ip()]:
            try:
                s.sendto(messaggio.encode("utf-8"), (dest, PORTA_UDP))
            except OSError:
                pass
        dati, da = s.recvfrom(256)
        t = dati.decode("utf-8", "ignore")
        if t.startswith("VMIA!"):
            parti = t[5:].split(":", 2)
            return da[0], {"id": parti[0], "nome": parti[2] if len(parti) > 2 else ""}
    except (OSError, socket.timeout):
        pass
    return None, None


def _chiedi(ip, percorso, token="", dati=None, metodo="POST", tempo=30):
    req = urllib.request.Request(f"http://{ip}:{PORTA}{percorso}", data=dati, method=metodo,
                                 headers={"X-VM-Token": token, "Content-Type": "application/octet-stream"})
    with urllib.request.urlopen(req, timeout=tempo) as r:
        return r.read()


def abbina(codice, mio_id, mio_nome, ips=()):
    """ips: gli indirizzi del PC scritti nel QR (si prova prima quelli: funziona anche dove la ricerca e' bloccata)."""
    ip = None
    for x in ips or ():
        try:
            with urllib.request.urlopen(f"http://{x}:{PORTA}/vm/ping", timeout=2) as r:
                json.loads(r.read())
            ip = x
            break
        except Exception:
            continue
    if not ip:
        ip, info = cerca(f"VMIA-CODICE?{codice}", attesa=3)
    if not ip:
        return None, "non_trovato"
    try:
        r = json.loads(_chiedi(ip, "/vm/abbina", dati=json.dumps({"codice": codice, "id": mio_id, "nome": mio_nome}).encode()))
        return {"id": r["id"], "nome": r["nome"], "token": r["token"], "ip": ip, "ultimo": "", "ruolo": "centro"}, None
    except urllib.error.HTTPError:
        return None, "codice"
    except Exception:
        log.exception("sincronizza: abbina")
        return None, "rete"


def sincronizza(centro, base, pacchetti, cfg, opzioni, avanzamento=lambda f, t: None):
    """Un giro con il centro. Torna {"arrivati", "mandati", "uniti", "ip"} o solleva un errore."""
    ip, _ = cerca(f"VMIA?{centro['id']}", centro.get("ip"), id_centro=centro["id"])
    if not ip:
        raise ConnectionError("non_trovato")
    tok = centro["token"]
    stat = {"arrivati": 0, "mandati": 0, "uniti": 0, "ip": ip}
    # prima il profilo: cosi' le lezioni eliminate da una parte spariscono anche dall'altra (e non tornano indietro)
    # (senza «Studio» il profilo porta solo le lezioni eliminate)
    scrivi_profilo(base, cfg, opzioni.get("studio", True))
    prof = Path(base) / PROFILO
    u = json.loads(_chiedi(ip, f"/vm/unisci?p={urllib.parse.quote(PROFILO)}&m={prof.stat().st_mtime}", tok,
                           json.dumps(el.leggi_json(prof, {})).encode()))
    el.scrivi_json(prof, u)
    stat["tolte"] = leggi_profilo(base, cfg, opzioni.get("studio", True))
    loro = json.loads(_chiedi(ip, "/vm/elenco", tok, json.dumps(opzioni).encode(), tempo=600))["file"]
    f = Firme(base)
    miei = elenco(base, pacchetti, opzioni, f)
    f.salva()
    loro.pop(PROFILO, None)
    elim = set(cfg.get("sync_eliminate") or [])
    lavori = []
    for rel in sorted(set(loro) | set(miei)):
        if rel.split("/", 1)[0] in elim:
            continue
        a, b = miei.get(rel), loro.get(rel)
        if a and b and a["f"] == b["f"]:
            continue
        lavori.append((rel, a, b))
    tot = len(lavori) or 1
    for i, (rel, a, b) in enumerate(lavori):
        avanzamento(i / tot, rel)
        try:
            if a and b and _unibile(rel):
                mio = el.leggi_json(_dove(base, pacchetti, rel), None)
                u = json.loads(_chiedi(ip, f"/vm/unisci?p={urllib.parse.quote(rel)}&m={a['m']}", tok, json.dumps(mio).encode()))
                el.scrivi_json(_dove(base, pacchetti, rel), u)
                stat["uniti"] += 1
            elif b and (not a or b["m"] > a["m"] + 1):
                req = urllib.request.Request(f"http://{ip}:{PORTA}/vm/file?p={urllib.parse.quote(rel)}", headers={"X-VM-Token": tok})
                with urllib.request.urlopen(req, timeout=120) as r:
                    scrivi(base, pacchetti, rel, r, b["m"], int(r.headers.get("Content-Length") or 0))
                stat["arrivati"] += 1
            elif a and (not b or a["m"] > b["m"] + 1):
                p = _dove(base, pacchetti, rel)
                with open(p, "rb") as fh:
                    req = urllib.request.Request(f"http://{ip}:{PORTA}/vm/manda?p={urllib.parse.quote(rel)}&m={a['m']}", data=fh,
                                                 method="POST", headers={"X-VM-Token": tok, "Content-Length": str(p.stat().st_size),
                                                                         "Content-Type": "application/octet-stream"})
                    urllib.request.urlopen(req, timeout=120).read()
                stat["mandati"] += 1
        except Exception:
            log.exception("sincronizza: %s", rel)
    _chiedi(ip, "/vm/fine", tok, json.dumps(stat).encode())
    avanzamento(1.0, "")
    return stat


def _materia(rel):
    """esami/<materia>.json: date d'esame, test, interrogazioni, piano (non glossario e mappa)."""
    return rel.startswith("esami/") and rel.count("/") == 1 and rel.endswith(".json") \
        and not re.search(r"_(glossario|mappa_verifica)\.json$", rel)


def _unibile(rel):
    nome = rel.rsplit("/", 1)[-1]
    return rel == PROFILO or nome in ("ripasso.json", "foto.json", "scritti.json") or _materia(rel)
