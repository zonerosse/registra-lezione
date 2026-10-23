# -*- coding: utf-8 -*-
"""Le icone dell'app iPhone di Scripta Manent (ios/icons/scriptamanent-*.png), come quelle di Verba Manent IA:
il simbolo in alto e sotto la scritta «Scripta Manent», su fondo verde petrolio pieno (iOS arrotonda da solo gli angoli).
Uso: python tools/icone_iphone_scripta.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import logo_scripta as ls

RADICE = Path(__file__).resolve().parent.parent
LATI = [1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20]
FONT = RADICE / "app" / "interfaccia" / "font" / "Lexend-Bold.ttf"


def grande():
    n = 1024
    im = ls._fondo(n)
    simbolo = ls._segni(n, scala=0.62, centro=50.0)
    im.alpha_composite(simbolo, (0, -int(n * 0.09)))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(str(FONT), int(n * 0.105))
    t1, t2 = "Scripta ", "Manent"
    w1, w2 = d.textlength(t1, font=f), d.textlength(t2, font=f)
    x, y = (n - w1 - w2) / 2, n * 0.70
    d.text((x, y), t1, font=f, fill=ls.TESTO)
    d.text((x + w1, y), t2, font=f, fill=ls.MAPPA)
    return im.convert("RGB")


def main():
    g = grande()
    for s in LATI:
        g.resize((s, s), Image.LANCZOS).save(RADICE / "ios" / "icons" / f"scriptamanent-{s}.png")
    print("fatto")


if __name__ == "__main__":
    main()
