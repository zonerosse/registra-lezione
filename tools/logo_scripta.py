# -*- coding: utf-8 -*-
"""Disegna il logo di Scripta Manent (le righe di testo che diventano una piccola mappa), nello stesso stile
del logo di Verba Manent IA ma su fondo verde petrolio. Uso: python tools/logo_scripta.py
Crea grafica/scripta/icona.ico (exe, collegamenti e installazione) e grafica/scripta/logo-256.png.
Stanno FUORI dalla cartella app: l'aggiornamento (app) e' lo stesso per le due edizioni."""
from pathlib import Path
from PIL import Image, ImageDraw

RADICE = Path(__file__).resolve().parent.parent
DEST = RADICE / "grafica" / "scripta"
FONDO = ((15, 118, 110), (6, 48, 45))         # verde petrolio, dall'alto a sinistra al basso a destra
MAPPA = (94, 234, 212)
TESTO = (255, 255, 255)
RIGHE = [(14, 33, 28), (14, 43, 22), (14, 53, 28), (14, 63, 16)]        # x, y, lunghezza (su 100)
NODI = [(66, 50, 7), (80, 32, 5), (82, 52, 5), (76, 70, 5)]            # x, y, raggio
RAMI = [(66, 50, 80, 32), (66, 50, 82, 52), (66, 50, 76, 70)]


def _fondo(n):
    im = Image.new("RGBA", (n, n))
    px = im.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * n - 2)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(*FONDO)) + (255,)
    return im


def _segni(n, scala=1.0, centro=50.0):
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = n / 100

    def p(v):
        return (centro + (v - centro) * scala) * k
    w = 5 * scala * k
    for x, y, l in RIGHE:
        d.rounded_rectangle((p(x), p(y), p(x + l), p(y) + w), radius=w / 2, fill=TESTO)
    for x1, y1, x2, y2 in RAMI:
        d.line((p(x1), p(y1), p(x2), p(y2)), fill=MAPPA, width=max(1, int(3.5 * scala * k)))
    for x, y, r in NODI:
        rr = r * scala * k
        d.ellipse((p(x) - rr, p(y) - rr, p(x) + rr, p(y) + rr), fill=MAPPA)
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
    DEST.mkdir(parents=True, exist_ok=True)
    grande = icona(256)
    grande.save(DEST / "icona.ico", sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    grande.save(DEST / "logo-256.png")
    print("fatto:", DEST)


if __name__ == "__main__":
    main()
