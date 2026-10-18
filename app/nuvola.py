# -*- coding: utf-8 -*-
"""
«Sincronizza anche fuori casa»: quando PC e telefono non sono sulla stessa rete, le lezioni passano dal cloud
dello studente (Google Drive o OneDrive), ognuna chiusa in uno zip con password (zip_aes.py).

Nel cloud, cartella «Verba Manent IA» (su OneDrive: App › Verba Manent IA):
  <lezione>.zip     tutti i file della lezione (come con il Wi-Fi: niente video) e i suoi PDF degli appunti
  studio.zip        materie (date d'esame, voti, glossario, libro…) e il profilo di studio (ripasso, lezioni eliminate)
  indice.json       per ogni zip la sua «firma» (cosa c'e' dentro), cosi' si scarica solo quello che e' cambiato;
                    e una verifica della password (non la password)
  LEGGIMI.txt       cosa sono questi file e come riaprirli con 7-Zip

Regole come per il Wi-Fi (sincronizza.py): un file nuovo si copia, se e' cambiato da una parte sola vince quella,
se e' cambiato da tutte e due si unisce (ripasso, materie, foto, profilo) o vince il piu' recente.

L'accesso (OAuth) apre il browser una volta; il permesso chiesto e' il piu' piccolo: il programma vede SOLO i file
che crea lui (Google: drive.file; Microsoft: la sua cartella App). Il telefono collegato con il QR riceve dal PC
accesso e password: non serve accedere anche li'.
"""
import base64
import hashlib
import json
import logging
import os
import re
import secrets
import shutil
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import elaborazione as el
import sincronizza as sy
import zip_aes as za

log = logging.getLogger("registra_lezione")

CARTELLA = "Verba Manent IA"
STUDIO = "_studio"
INDICE = "indice.json"
PEZZO = 8 * 1024 * 1024            # caricamenti a pezzi da 8 MB (multiplo di 256 KB e di 320 KB)
_APP = Path(__file__).with_name("nuvola_app.json")


def credenziali():
    """Gli identificativi dell'app presso Google e Microsoft (non sono segreti: identificano il programma)."""
    d = el.leggi_json(_APP, {}) or {}
    g = d.get("google") or {}
    if g.get("segreto_b64"):
        g["segreto"] = base64.b64decode(g["segreto_b64"]).decode()
    return {"google": g if g.get("id") else None, "microsoft": d.get("microsoft") if (d.get("microsoft") or {}).get("id") else None}


def nuova_chiave():
    alfa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    s = "".join(secrets.choice(alfa) for _ in range(16))
    return "-".join(s[i:i + 4] for i in range(0, 16, 4))


def verifica_di(chiave, sale=None):
    sale = sale or secrets.token_hex(8)
    return sale + ":" + hashlib.pbkdf2_hmac("sha256", chiave.encode(), bytes.fromhex(sale), 20000, 12).hex()


def chiave_giusta(chiave, verifica):
    try:
        sale = verifica.split(":")[0]
        return secrets.compare_digest(verifica_di(chiave, sale), verifica)
    except Exception:
        return False


LEGGIMI = """Verba Manent IA – lezioni sincronizzate
========================================

Questi file li ha messi qui Verba Manent IA per avere le stesse lezioni sul PC e sul telefono anche quando
non sono sulla stessa rete Wi-Fi. Ogni lezione è uno zip chiuso con una password: senza password non si apre.

Non serve aprirli: il programma li prende da solo. Se però hai perso PC e telefono e vuoi recuperare una lezione:
  1. installa 7-Zip (https://www.7-zip.org) – sul Mac: Keka;
  2. apri lo zip e scrivi la password degli zip (la trovi in Verba Manent IA: Impostazioni › Sincronizza,
     oppure sul foglio dove l'hai scritta).

Non cambiare né spostare questi file: il programma non li troverebbe più.

---

Verba Manent IA – synced lessons. Each lesson is a password-protected zip (AES-256). The program reads them by
itself; to open one by hand use 7-Zip with the zip password (Settings › Sync). Do not rename or move these files.
"""


# =========================================================================================== accesso (OAuth)

def _pkce():
    v = secrets.token_urlsafe(48)
    c = base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b"=").decode()
    return v, c


def _post(url, campi):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(campi).encode(), method="POST",
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


PAGINA_FATTO = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verba Manent IA</title><body style="font-family:system-ui,sans-serif;background:#f1f5f9;display:grid;place-items:center;min-height:90vh;margin:0">
<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08)">
<div style="font-size:42px">{ico}</div><h2 style="color:#0d4275;margin:8px 0">{t}</h2><p style="color:#475569">{s}</p></div></body>"""


def accedi(provider, apri, testi):
    """Apre il browser per l'accesso e aspetta (massimo 5 minuti). Torna {"refresh", "email"} o solleva un errore."""
    cr = credenziali()[provider]
    if not cr:
        raise RuntimeError("non_disponibile")
    verificatore, sfida = _pkce()
    stato = secrets.token_urlsafe(16)
    preso = {}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
            if q.get("state") != stato:
                self.send_response(404)
                self.end_headers()
                return
            preso.update(q)
            ok = bool(q.get("code"))
            b = PAGINA_FATTO.format(ico="✅" if ok else "⚠️", t=testi["ok_t" if ok else "no_t"], s=testi["ok_s" if ok else "no_s"]).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)
    srv = HTTPServer(("127.0.0.1", 0), H)
    porta = srv.server_address[1]
    if provider == "google":
        rit = f"http://127.0.0.1:{porta}"
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
            "client_id": cr["id"], "redirect_uri": rit, "response_type": "code", "state": stato,
            "scope": "https://www.googleapis.com/auth/drive.file openid email", "access_type": "offline", "prompt": "consent",
            "code_challenge": sfida, "code_challenge_method": "S256"})
    else:
        rit = f"http://localhost:{porta}"
        url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + urllib.parse.urlencode({
            "client_id": cr["id"], "redirect_uri": rit, "response_type": "code", "state": stato, "prompt": "select_account",
            "scope": "Files.ReadWrite.AppFolder User.Read offline_access", "code_challenge": sfida, "code_challenge_method": "S256"})
    srv.timeout = 1
    apri(url)
    fine = time.time() + 300
    try:
        while not preso and time.time() < fine:
            srv.handle_request()
    finally:
        srv.server_close()
    if not preso.get("code"):
        raise RuntimeError("annullato" if preso else "tempo")
    if provider == "google":
        t = _post("https://oauth2.googleapis.com/token", {
            "code": preso["code"], "client_id": cr["id"], "client_secret": cr.get("segreto", ""), "redirect_uri": rit,
            "grant_type": "authorization_code", "code_verifier": verificatore})
    else:
        t = _post("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            "code": preso["code"], "client_id": cr["id"], "redirect_uri": rit, "grant_type": "authorization_code",
            "code_verifier": verificatore, "scope": "Files.ReadWrite.AppFolder User.Read offline_access"})
    if not t.get("refresh_token"):
        raise RuntimeError("token")
    c = Cloud.nuovo(provider, t["refresh_token"])
    c._token, c._scade = t["access_token"], time.time() + int(t.get("expires_in", 3000)) - 120
    return {"refresh": c.refresh, "email": c.email()}


# =========================================================================================== i due cloud

class ErroreAccesso(Exception):
    """L'accesso non vale piu' (password cambiata, permesso tolto): bisogna accedere di nuovo."""


class Cloud:
    """Base comune: token, richieste, elenco della cartella, caricare/scaricare a pezzi."""

    @staticmethod
    def nuovo(provider, refresh):
        return (Drive if provider == "google" else OneDrive)(refresh)

    def __init__(self, refresh):
        self.refresh = refresh
        self._token = None
        self._scade = 0

    def token(self):
        if self._token and time.time() < self._scade:
            return self._token
        try:
            t = self._rinnova()
        except urllib.error.HTTPError as e:
            if e.code in (400, 401):
                raise ErroreAccesso() from e
            raise
        self._token = t["access_token"]
        self._scade = time.time() + int(t.get("expires_in", 3000)) - 120
        if t.get("refresh_token"):
            self.refresh = t["refresh_token"]
        return self._token

    def _req(self, metodo, url, dati=None, testa=None, json_=None, tempo=60, crudo=False):
        h = {"Authorization": "Bearer " + self.token()}
        if json_ is not None:
            dati = json.dumps(json_).encode()
            h["Content-Type"] = "application/json"
        h.update(testa or {})
        req = urllib.request.Request(url, data=dati, method=metodo, headers=h)
        r = urllib.request.urlopen(req, timeout=tempo)
        if crudo:
            return r
        with r:
            b = r.read()
            return json.loads(b) if b and r.headers.get("Content-Type", "").startswith("application/json") else b

    def scarica(self, fid, dest):
        with self._url_file(fid) as r, open(dest, "wb") as fh:
            shutil.copyfileobj(r, fh, 1 << 20)

    def leggi_json(self, nome, elenco):
        x = elenco.get(nome)
        if not x:
            return None
        with self._url_file(x["id"]) as r:
            return json.loads(r.read() or b"null")


class Drive(Cloud):
    API = "https://www.googleapis.com/drive/v3"
    SU = "https://www.googleapis.com/upload/drive/v3"

    def _rinnova(self):
        cr = credenziali()["google"]
        return _post("https://oauth2.googleapis.com/token", {"client_id": cr["id"], "client_secret": cr.get("segreto", ""),
                                                             "refresh_token": self.refresh, "grant_type": "refresh_token"})

    def email(self):
        try:
            return self._req("GET", "https://openidconnect.googleapis.com/v1/userinfo").get("email", "")
        except Exception:
            return ""

    def cartella(self):
        q = urllib.parse.quote(f"name='{CARTELLA}' and mimeType='application/vnd.google-apps.folder' and trashed=false")
        r = self._req("GET", f"{self.API}/files?q={q}&fields=files(id)&spaces=drive")
        if r.get("files"):
            return r["files"][0]["id"], False
        r = self._req("POST", f"{self.API}/files?fields=id", json_={"name": CARTELLA, "mimeType": "application/vnd.google-apps.folder"})
        return r["id"], True

    def elenco(self, cid):
        out, pag = {}, ""
        while True:
            q = urllib.parse.quote(f"'{cid}' in parents and trashed=false")
            r = self._req("GET", f"{self.API}/files?q={q}&fields=nextPageToken,files(id,name,size)&pageSize=1000" + (f"&pageToken={pag}" if pag else ""))
            for f in r.get("files", []):
                out[f["name"]] = {"id": f["id"], "s": int(f.get("size") or 0)}
            pag = r.get("nextPageToken")
            if not pag:
                return out

    def _url_file(self, fid):
        return self._req("GET", f"{self.API}/files/{fid}?alt=media", tempo=120, crudo=True)

    def carica(self, cid, nome, sorgente, fid=None):
        """sorgente: percorso o byte. Caricamento «resumable» a pezzi (anche per file grandi)."""
        dati = sorgente if isinstance(sorgente, (bytes, bytearray)) else None
        n = len(dati) if dati is not None else os.path.getsize(sorgente)
        meta = {"name": nome} if fid else {"name": nome, "parents": [cid]}
        r = self._req("PATCH" if fid else "POST", f"{self.SU}/files" + (f"/{fid}" if fid else "") + "?uploadType=resumable&fields=id",
                      json_=meta, testa={"X-Upload-Content-Length": str(n), "X-Upload-Content-Type": "application/octet-stream"}, crudo=True)
        sessione = r.headers["Location"]
        r.close()
        return self._pezzi(sessione, dati, sorgente, n, True)

    def _pezzi(self, url, dati, sorgente, n, auth):
        fh = None if dati is not None else open(sorgente, "rb")
        try:
            inizio = 0
            while True:
                b = dati[inizio:inizio + PEZZO] if dati is not None else fh.read(PEZZO)
                fine = inizio + len(b)
                h = {"Content-Length": str(len(b)), "Content-Range": f"bytes {inizio}-{fine - 1}/{n}" if n else "bytes */0"}
                if auth:
                    h["Authorization"] = "Bearer " + self.token()
                req = urllib.request.Request(url, data=b, method="PUT", headers=h)
                try:
                    with urllib.request.urlopen(req, timeout=300) as r:
                        x = r.read()
                        return json.loads(x) if x else {}
                except urllib.error.HTTPError as e:
                    if e.code != 308:          # 308 = «avanti, manda il resto» (Google)
                        raise
                inizio = fine
        finally:
            if fh:
                fh.close()

    def elimina(self, fid):
        self._req("DELETE", f"{self.API}/files/{fid}")


class OneDrive(Cloud):
    API = "https://graph.microsoft.com/v1.0/me/drive"

    def _rinnova(self):
        cr = credenziali()["microsoft"]
        return _post("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            "client_id": cr["id"], "refresh_token": self.refresh, "grant_type": "refresh_token",
            "scope": "Files.ReadWrite.AppFolder User.Read offline_access"})

    def email(self):
        try:
            r = self._req("GET", "https://graph.microsoft.com/v1.0/me")
            return r.get("mail") or r.get("userPrincipalName") or ""
        except Exception:
            return ""

    def cartella(self):
        r = self._req("GET", f"{self.API}/special/approot?$select=id,folder")
        return r["id"], not (r.get("folder") or {}).get("childCount")

    def elenco(self, cid):
        out = {}
        url = f"{self.API}/items/{cid}/children?$select=id,name,size&$top=999"
        while url:
            r = self._req("GET", url)
            for f in r.get("value", []):
                out[f["name"]] = {"id": f["id"], "s": int(f.get("size") or 0)}
            url = r.get("@odata.nextLink")
        return out

    def _url_file(self, fid):
        return self._req("GET", f"{self.API}/items/{fid}/content", tempo=120, crudo=True)

    def carica(self, cid, nome, sorgente, fid=None):
        dati = sorgente if isinstance(sorgente, (bytes, bytearray)) else None
        n = len(dati) if dati is not None else os.path.getsize(sorgente)
        percorso = urllib.parse.quote(nome)
        if n < 4 * 1024 * 1024:
            b = dati if dati is not None else Path(sorgente).read_bytes()
            return self._req("PUT", f"{self.API}/items/{cid}:/{percorso}:/content", dati=b, testa={"Content-Type": "application/octet-stream"}, tempo=300)
        r = self._req("POST", f"{self.API}/items/{cid}:/{percorso}:/createUploadSession",
                      json_={"item": {"@microsoft.graph.conflictBehavior": "replace"}})
        return Drive._pezzi(self, r["uploadUrl"], dati, sorgente, n, False)

    def elimina(self, fid):
        self._req("DELETE", f"{self.API}/items/{fid}")


# =========================================================================================== le «unita'» da sincronizzare

def nome_zip(unita):
    if unita == STUDIO:
        return "studio.zip"
    return re.sub(r'[\\/:*?"<>|#%]+', "-", unita).strip(" .")[:180] + ".zip"


def unita_locali(base, pacchetti, opzioni, cfg):
    """{unita': {rel: {"s", "m", "f"}}}: una per lezione (con i suoi PDF degli appunti) piu' «_studio»."""
    base = Path(base)
    sy.scrivi_profilo(base, cfg, opzioni.get("studio", True))
    f = sy.Firme(base)
    tutto = sy.elenco(base, pacchetti, dict(opzioni, video=False), f)
    prof = base / sy.PROFILO
    if prof.exists():
        tutto[sy.PROFILO] = {"s": prof.stat().st_size, "m": prof.stat().st_mtime, "f": f.di(prof, sy.PROFILO)}
    f.salva()
    pdf_di = {}
    for c in base.iterdir():
        if c.is_dir() and not c.name.startswith(".") and c.name != "esami":
            info = el.leggi_json(c / "info.json", {}) or {}
            for p in sy._pdf_di(info):
                pdf_di[re.split(r"[\\/]", p)[-1]] = c.name
    out = {}
    for rel, m in tutto.items():
        if rel.startswith(sy.PAC):
            u = pdf_di.get(rel[len(sy.PAC):])
            if not u:
                continue
        elif rel.startswith("esami/") or rel == sy.PROFILO:
            u = STUDIO
        else:
            u = rel.split("/", 1)[0]
        out.setdefault(u, {})[rel] = m
    return out


def firma(files):
    return hashlib.sha1("\n".join(f"{r}\t{m['f']}" for r, m in sorted(files.items())).encode()).hexdigest()[:24]


def _impacchetta(base, pacchetti, files, dest, chiave):
    voci = [(rel, str(sy._dove(base, pacchetti, rel)), m["m"]) for rel, m in sorted(files.items())]
    manifesto = json.dumps({rel: m["m"] for rel, m in files.items()}, ensure_ascii=False).encode()
    voci.append((".vm/manifesto.json", manifesto, time.time()))
    za.scrivi(dest, voci, chiave)


def _spacchetta(base, pacchetti, zipf, chiave, cfg, studio=True):
    """Lo zip dal cloud unito ai file di qui (stesse regole del Wi-Fi). Torna quanti file sono cambiati."""
    tmp = Path(tempfile.mkdtemp(prefix="vmia_"))
    try:
        nomi = {}

        def dove(nome, mt):
            if nome.startswith("/") or ".." in nome.split("/"):
                return None
            p = tmp / ("f%05d" % len(nomi))
            nomi[nome] = (p, mt)
            return open(p, "wb")
        za.leggi(zipf, chiave, dove)
        man = {}
        if ".vm/manifesto.json" in nomi:
            man = json.loads(nomi.pop(".vm/manifesto.json")[0].read_bytes() or b"{}")
        cambiati = 0
        for rel, (p, mt) in nomi.items():
            mt = float(man.get(rel, mt))
            dest = sy._dove(base, pacchetti, rel)
            if rel == sy.PROFILO and not studio:
                continue
            if dest.exists():
                mio_m = dest.stat().st_mtime
                if sy._unibile(rel):
                    mio, suo = el.leggi_json(dest, None), json.loads(p.read_bytes() or b"null")
                    if mio is not None and suo is not None:
                        u = sy.unisci(rel, mio, suo, mio_m >= mt)
                        if u is not None and u != mio:
                            el.scrivi_json(dest, u)
                            cambiati += 1
                        continue
                if mt <= mio_m + 1 or p.read_bytes() == dest.read_bytes():
                    continue
            with open(p, "rb") as fh:
                sy.scrivi(base, pacchetti, rel, fh, mt, p.stat().st_size)
            cambiati += 1
        if sy.PROFILO in nomi:
            sy.leggi_profilo(base, cfg, studio)
        return cambiati
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# =========================================================================================== un giro

def giro(cloud, base, pacchetti, cfg, opzioni, chiave, avanzamento=lambda f: None, nome_disp=""):
    """Un giro con il cloud. Torna {"su", "giu", "uniti"}; solleva ErroreAccesso / za.PasswordSbagliata."""
    base = Path(base)
    stato_f = base / ".vm" / "nuvola.json"
    stato = el.leggi_json(stato_f, {}) or {}
    ultime = stato.setdefault("ultime", {})
    studio = opzioni.get("studio", True)
    cid, nuova = cloud.cartella()
    elenco = cloud.elenco(cid)
    if "LEGGIMI.txt" not in elenco:
        cloud.carica(cid, "LEGGIMI.txt", LEGGIMI.encode("utf-8"))
    indice = cloud.leggi_json(INDICE, elenco) or {}
    if indice.get("verifica") and not chiave_giusta(chiave, indice["verifica"]):
        raise za.PasswordSbagliata("indice")
    mie = {}           # unita' -> voce dell'indice (None = tolta)
    st = {"su": 0, "giu": 0, "uniti": 0}
    lavoro = Path(tempfile.mkdtemp(prefix="vmia_z_"))

    def scarica_e_unisci(u):
        f = lavoro / "giu.zip"
        cloud.scarica(elenco[nome_zip(u)]["id"], f)
        n = _spacchetta(base, pacchetti, f, chiave, cfg, studio)
        f.unlink(missing_ok=True)
        return n

    def carica(u, files):
        f = lavoro / "su.zip"
        _impacchetta(base, pacchetti, files, f, chiave)
        nz = nome_zip(u)
        x = elenco.get(nz)
        r = cloud.carica(cid, nz, str(f), x["id"] if x else None)
        if not x and isinstance(r, dict) and r.get("id"):
            elenco[nz] = {"id": r["id"], "s": f.stat().st_size}
        f.unlink(missing_ok=True)
        fi = firma(files)
        mie[u] = {"f": fi, "m": time.time(), "da": nome_disp}
        ultime[u] = fi
        st["su"] += 1

    def una(u, locali):
        voce = (indice.get("unita") or {}).get(u)
        sl = firma(locali[u]) if u in locali else None
        sc = voce["f"] if voce and nome_zip(u) in elenco else None
        if sl == sc:
            if sl:
                ultime[u] = sl
            return
        if sc is None:
            carica(u, locali[u])
        elif sl is None or sc != ultime.get(u):
            scarica_e_unisci(u)
            st["giu"] += 1
            nuove = unita_locali(base, pacchetti, opzioni, cfg)
            sl2 = firma(nuove[u]) if u in nuove else None
            if sl is not None and sl2 != sc and u in nuove:
                carica(u, nuove[u])              # cambiata da tutte e due le parti: unita qui e rimandata
                st["uniti"] += 1
            else:
                ultime[u] = sc
        else:
            carica(u, locali[u])

    try:
        locali = unita_locali(base, pacchetti, opzioni, cfg)
        # prima lo studio: porta le lezioni eliminate altrove
        if studio or opzioni.get("materie", True):
            una(STUDIO, locali)
            locali = unita_locali(base, pacchetti, opzioni, cfg)
        elim = set(cfg.get("sync_eliminate") or [])
        for u in list((indice.get("unita") or {})):
            if u in elim:
                x = elenco.get(nome_zip(u))
                if x:
                    try:
                        cloud.elimina(x["id"])
                    except Exception:
                        log.exception("nuvola: elimina %s", u)
                mie[u] = None
        tutte = sorted((set(locali) | set(indice.get("unita") or {})) - elim - {STUDIO})
        if not opzioni.get("lezioni", True):
            tutte = []
        for i, u in enumerate(tutte):
            avanzamento(i / max(1, len(tutte)))
            try:
                una(u, locali)
            except za.PasswordSbagliata:
                raise
            except ErroreAccesso:
                raise
            except Exception:
                log.exception("nuvola: %s", u)
        # l'indice: riletto adesso (un altro dispositivo puo' averlo cambiato nel frattempo) e aggiornato
        if mie or not indice.get("verifica"):
            elenco = cloud.elenco(cid)
            ind = cloud.leggi_json(INDICE, elenco) or {}
            ind.setdefault("unita", {})
            for u, v in mie.items():
                if v is None:
                    ind["unita"].pop(u, None)
                else:
                    ind["unita"][u] = v
            ind["verifica"] = ind.get("verifica") or verifica_di(chiave)
            ind["versione"] = 1
            x = elenco.get(INDICE)
            cloud.carica(cid, INDICE, json.dumps(ind, ensure_ascii=False, indent=1).encode("utf-8"), x["id"] if x else None)
        stato["quando"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        el.scrivi_json(stato_f, stato)
        avanzamento(1.0)
        return st
    finally:
        shutil.rmtree(lavoro, ignore_errors=True)


def controlla_chiave(cloud, chiave):
    """La password scritta dallo studente va bene per gli zip gia' nel cloud? (True se il cloud e' ancora vuoto)"""
    cid, _ = cloud.cartella()
    ind = cloud.leggi_json(INDICE, cloud.elenco(cid)) or {}
    return not ind.get("verifica") or chiave_giusta(chiave, ind["verifica"]), bool(ind.get("verifica"))
