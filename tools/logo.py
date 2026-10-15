# -*- coding: utf-8 -*-
"""Disegna il logo di Verba Manent IA (l'onda della voce che diventa righe di testo) in tutti i formati:
icona di Windows (app/icona.ico) e icone dell'app Android (mipmap). Uso: python tools/logo.py"""
from pathlib import Path
from PIL import Image, ImageDraw

RADICE = Path(__file__).resolve().parent.parent
FONDO = ((13, 66, 117), (6, 30, 54))          # blu scuro, dall'alto a sinistra al basso a destra
ONDA = (34, 211, 238)
TESTO = (255, 255, 255)
BARRE = [(16, 42, 16), (25, 32, 36), (34, 38, 24), (43, 28, 44)]     # x, y, altezza (su 100)
RIGHE = [(54, 33, 30), (54, 43, 24), (54, 53, 30), (54, 63, 18)]     # x, y, lunghezza


def _fondo(n):
    im = Image.new("RGBA", (n, n))
    px = im.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * n - 2)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(*FONDO)) + (255,)
    return im


def _segni(n, scala=1.0, centro=50.0):
    """Barre e righe su fondo trasparente; scala < 1 le stringe verso il centro (icone adattive)."""
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = n / 100

    def p(v):
        return (centro + (v - centro) * scala) * k
    w = 5 * scala * k
    for x, y, h in BARRE:
        d.rounded_rectangle((p(x), p(y), p(x) + w, p(y + h)), radius=w / 2, fill=ONDA)
    for x, y, l in RIGHE:
        d.rounded_rectangle((p(x), p(y), p(x + l), p(y) + w), radius=w / 2, fill=TESTO)
    return im


def icona(n, angoli=True):
    S = n * 4
    im = _fondo(S)
    im.alpha_composite(_segni(S))
    if angoli:
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=S * 0.24, fill=255)
        im.putalpha(m)
    return im.resize((n, n), Image.LANCZOS)


def main():
    grande = icona(256)
    grande.save(RADICE / "app" / "icona.ico", sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    grande.save(RADICE / "app" / "interfaccia" / "logo.png")
    res = RADICE / "android" / "app" / "src" / "main" / "res"
    for d, k in {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}.items():
        n = int(108 * k)
        # icona adattiva: i segni stanno nel cerchio centrale (Android ritaglia la forma)
        _segni(n * 4, scala=0.62).resize((n, n), Image.LANCZOS).save(res / f"mipmap-{d}" / "ic_launcher_foreground.png")
        m = int(48 * k)
        icona(m).save(res / f"mipmap-{d}" / "ic_launcher.png")
        tondo = icona(m, angoli=False)
        mask = Image.new("L", (m * 4, m * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, m * 4 - 1, m * 4 - 1), fill=255)
        tondo.putalpha(mask.resize((m, m), Image.LANCZOS))
        tondo.save(res / f"mipmap-{d}" / "ic_launcher_round.png")
    print("logo fatto")


if __name__ == "__main__":
    main()
