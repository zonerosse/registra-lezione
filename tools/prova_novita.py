# -*- coding: utf-8 -*-
"""
Prova su Windows vero delle parti nuove che usano Windows (la usa GitHub: workflow "Prova novita'").
  1. slide del docente: Windows disegna le pagine di un PDF (PowerShell + Windows.Data.Pdf) e pypdf legge il testo
  2. microfoni: l'elenco non deve bloccarsi (sul server di GitHub di solito non ce ne sono)
  3. il piccolo server dei video risponde a pezzi (Range)
  4. la finestra (WebView2) riesce a far partire un video mp4 da quel server, dal secondo giusto
  5. faster-whisper accetta le "parole difficili" (hotwords)
Risultati in prova_novita/esito.txt.
"""
import inspect
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import traceback
import urllib.request
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
OUT = RADICE / "prova_novita"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(RADICE / "app"))
righe = []


def scrivi(s):
    print(s, flush=True)
    righe.append(s)
    (OUT / "esito.txt").write_text("\n".join(righe), encoding="utf-8")


def prova(nome, f):
    t0 = time.monotonic()
    try:
        r = f()
        scrivi(f"OK   {nome} ({time.monotonic() - t0:.1f} s): {r}")
        return True
    except Exception:
        scrivi(f"NO   {nome}: {traceback.format_exc()[-1500:]}")
        return False


def pdf_di_prova(dest):
    from fpdf import FPDF
    pdf = FPDF(orientation="L", format="A4")
    for i, (tit, testo) in enumerate([("Limiti notevoli", "seno di x fratto x tende a uno, teorema del confronto"),
                                      ("Derivate", "rapporto incrementale e retta tangente"),
                                      ("De l'Hopital", "forme indeterminate zero su zero")], 1):
        pdf.add_page()
        pdf.set_font("helvetica", "B", 36)
        pdf.cell(0, 30, f"{i}. {tit}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 20)
        pdf.multi_cell(0, 12, testo)
    pdf.output(str(dest))


def p_docente():
    import docente
    with tempfile.TemporaryDirectory() as tmp:
        c = Path(tmp) / "lezione"
        c.mkdir()
        pdf = Path(tmp) / "slide.pdf"
        pdf_di_prova(pdf)
        d = docente.aggiungi(c, pdf)
        pagine = d["pagine"]
        assert len(pagine) == 3, f"pagine disegnate: {len(pagine)}"
        from PIL import Image
        with Image.open(c / "slide" / pagine[0]["file"]) as im:
            dim = im.size
            # la pagina non deve essere tutta bianca
            estremi = im.convert("L").getextrema()
        assert estremi[0] < 100, f"pagina vuota? {estremi}"
        Image.open(c / "slide" / pagine[0]["file"]).save(OUT / "pagina1.jpg")
        assert "Limiti" in pagine[0]["testo"], pagine[0]["testo"]
        return f"{len(pagine)} pagine {dim}, testo: {pagine[0]['testo'][:40]!r}"


def p_microfoni():
    import registratore as rg
    m = rg.microfoni()
    liv = rg.livello_microfono(m[0]["id"]) if m else None
    return f"{len(m)} microfoni {[x['nome'] for x in m][:3]}, livello {liv}"


def video_di_prova(dest):
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff, "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=10", "-f", "lavfi",
                    "-i", "sine=frequency=440", "-t", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
                    "-movflags", "+faststart", str(dest)], check=True)


VIDEO = OUT / "video_prova.mp4"


def p_server():
    import servi_video
    video_di_prova(VIDEO)
    url = servi_video.registra(VIDEO)
    req = urllib.request.Request(url, headers={"Range": "bytes=100-199"})
    with urllib.request.urlopen(req, timeout=10) as r:
        corpo = r.read()
        assert r.status == 206 and len(corpo) == 100, (r.status, len(corpo))
    return url


def p_webview_video():
    import servi_video
    import webview
    url = servi_video.registra(VIDEO)
    esito = {}
    pagina = f"""<!doctype html><html><body style="margin:0;background:#000">
<video id="v" controls preload="auto" src="{url}#t=12" style="width:100%"></video>
<script>
const v = document.getElementById('v');
window.esito = 'attesa';
v.addEventListener('loadedmetadata', () => {{ v.currentTime = 12; v.muted = true; v.play().catch(e => window.esito = 'play: ' + e); }});
v.addEventListener('playing', () => setTimeout(() => window.esito = 'ok ' + v.videoWidth + 'x' + v.videoHeight + ' t=' + v.currentTime.toFixed(1), 800));
v.addEventListener('error', () => window.esito = 'errore ' + (v.error && v.error.code));
</script></body></html>"""
    w = webview.create_window("prova video", html=pagina, width=700, height=450)

    def controlla():
        for _ in range(60):
            time.sleep(0.5)
            try:
                x = w.evaluate_js("window.esito")
            except Exception as e:
                x = f"js: {e}"
            esito["x"] = x
            if x and x != "attesa":
                break
        try:
            w.destroy()
        except Exception:
            pass
    webview.start(controlla, private_mode=True)
    x = esito.get("x")
    assert x and str(x).startswith("ok"), x
    return x


def p_hotwords():
    from faster_whisper import WhisperModel
    params = inspect.signature(WhisperModel.transcribe).parameters
    assert "hotwords" in params
    return "hotwords accettato"


def main():
    scrivi(f"Windows {sys.getwindowsversion() if sys.platform == 'win32' else sys.platform}")
    tutto = all([prova("slide del docente (PDF)", p_docente), prova("elenco microfoni", p_microfoni),
                 prova("server dei video", p_server), prova("video nella finestra", p_webview_video),
                 prova("parole difficili", p_hotwords)])
    scrivi("TUTTO A POSTO" if tutto else "QUALCOSA NON VA")
    os._exit(0)


if __name__ == "__main__":
    main()
