# -*- coding: utf-8 -*-
"""
Un piccolo server sul PC (solo 127.0.0.1) che manda alla finestra i video delle lezioni, cosi'
"Chiedi alla lezione" puo' farli partire dal minuto giusto dentro il programma.
Serve solo i file registrati con registra() (indirizzo con un codice casuale), a pezzi (Range),
come vuole il lettore video.
"""
import logging
import mimetypes
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

log = logging.getLogger("registra_lezione")
_file = {}
_server = None
_lock = threading.Lock()
TIPI = {".mp4": "video/mp4", ".m4a": "audio/mp4", ".webm": "video/webm", ".mov": "video/mp4",
        ".mkv": "video/x-matroska", ".mp3": "audio/mpeg", ".wav": "audio/wav"}


class _H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        p = _file.get(self.path.split("?")[0].split("#")[0].strip("/").split("/")[-1].split(".")[0])
        if not p or not p.exists():
            self.send_response(404)
            self.end_headers()
            return
        tot = p.stat().st_size
        inizio, fine = 0, tot - 1
        rng = self.headers.get("Range", "")
        if rng.startswith("bytes="):
            a, _, b = rng[6:].split(",")[0].partition("-")
            try:
                if a:
                    inizio = int(a)
                    fine = int(b) if b else tot - 1
                else:
                    inizio = max(0, tot - int(b))
            except ValueError:
                pass
            fine = min(fine, tot - 1)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {inizio}-{fine}/{tot}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", TIPI.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(fine - inizio + 1))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        try:
            with open(p, "rb") as f:
                f.seek(inizio)
                resto = fine - inizio + 1
                while resto > 0:
                    b = f.read(min(1 << 20, resto))
                    if not b:
                        break
                    self.wfile.write(b)
                    resto -= len(b)
        except (ConnectionError, OSError):
            pass


def registra(percorso):
    """Indirizzo http://127.0.0.1:<porta>/v/<codice> per il file (o None)."""
    global _server
    p = Path(percorso)
    if not p.exists():
        return None
    with _lock:
        if _server is None:
            _server = ThreadingHTTPServer(("127.0.0.1", 0), _H)
            _server.daemon_threads = True
            threading.Thread(target=_server.serve_forever, daemon=True).start()
        codice = next((c for c, f in _file.items() if f == p), None) or secrets.token_hex(12)
        _file[codice] = p
        return f"http://127.0.0.1:{_server.server_address[1]}/v/{codice}{p.suffix.lower()}"

