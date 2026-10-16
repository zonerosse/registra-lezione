"""Un RunPod finto per le prove di «Trascrivi sul server» (stesse risposte di api.runpod.ai/v2 con
l'immagine runpod/ai-api-faster-whisper). Uso: python runpod_finto.py PORTA  -> RL_RUNPOD_API=http://127.0.0.1:PORTA/v2/
Chiave buona: «rpa_prova…»; endpoint buono: «prova123»."""
import base64, json, subprocess, sys, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
LAVORI = {}
def durata(b):
    try:
        import imageio_ffmpeg
        r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", "-", "-f", "null", "-"], input=b, capture_output=True)
        t = r.stderr.decode("utf-8", "replace").rsplit("time=", 1)[1].split()[0]
        h, m, s = t.split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)
    except Exception:
        return 10.0
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _r(self, codice, d):
        b = json.dumps(d).encode(); self.send_response(codice); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def _ok(self):
        k = self.headers.get("Authorization", "")
        if not k.startswith("Bearer rpa_prova"):
            self._r(401, {"error": "Unauthorized"}); return None
        p = self.path.split("/")      # /v2/{endpoint}/run
        if p[2] != "prova123":
            self._r(404, {"error": "not found"}); return None
        return p
    def do_POST(self):
        p = self._ok()
        if not p: return
        corpo = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)))
        if p[3] == "run":
            i = corpo["input"]; b = base64.b64decode(i["audio_base64"]); d = durata(b)
            print("LAVORO", len(b), "byte", round(d, 1), "s", i["model"], i.get("language"), i.get("initial_prompt"), flush=True)
            jid = str(uuid.uuid4()); LAVORI[jid] = {"t0": time.time(), "d": d, "m": i["model"]}
            self._r(200, {"id": jid, "status": "IN_QUEUE"})
        else:
            self._r(200, {"status": "CANCELLED"})
    def do_GET(self):
        p = self._ok()
        if not p: return
        j = LAVORI.get(p[4])
        if not j: return self._r(404, {"error": "no job"})
        if time.time() - j["t0"] < 2:
            return self._r(200, {"id": p[4], "status": "IN_PROGRESS"})
        if j["m"] == "turbo":        # come l'immagine 0.4.1 vera: «turbo» non c'e'
            return self._r(200, {"id": p[4], "status": "FAILED", "error": json.dumps({"error_type": "<class 'ValueError'>", "error_message": "Model 'turbo' not found."})})
        segs, t = [], 0.0
        while t + 4 <= j["d"]:
            segs.append({"id": len(segs), "start": t, "end": t + 4, "text": f" Frase dal server al secondo {int(t)}.", "tokens": [1, 2]})
            t += 5
        self._r(200, {"id": p[4], "status": "COMPLETED", "delayTime": 1500, "executionTime": 800,
                      "output": {"segments": segs, "detected_language": "it", "transcription": "", "model": "turbo", "device": "cuda"}})
srv = ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H)
print("RUNPOD FINTO pronto", flush=True)
srv.serve_forever()
