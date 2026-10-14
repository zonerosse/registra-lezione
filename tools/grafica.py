# -*- coding: utf-8 -*-
"""Crea icona e immagini dell'installazione col marchio (python tools/grafica.py)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

R = Path(__file__).resolve().parent.parent


def sfumatura(w, h, colori, diag=True):
    im = Image.new("RGB", (w, h))
    px = im.load()
    n = len(colori) - 1
    for y in range(h):
        for x in range(w):
            f = ((x / w + y / h) / 2) if diag else y / h
            i = min(n - 1, int(f * n))
            g = f * n - i
            a, b = colori[i], colori[i + 1]
            px[x, y] = tuple(int(a[k] + (b[k] - a[k]) * g) for k in range(3))
    return im


def logo(lato):
    S = lato * 4
    base = sfumatura(S, S, [(34, 211, 238), (2, 132, 199), (13, 66, 117)])
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.24), fill=255)
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    im.paste(base, (0, 0), mask)
    d = ImageDraw.Draw(im)
    # riflesso in alto
    luce = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(luce).ellipse((-S * 0.3, -S * 0.75, S * 1.3, S * 0.42), fill=(255, 255, 255, 46))
    im = Image.alpha_composite(im, Image.composite(luce, Image.new("RGBA", (S, S)), mask))
    sopra = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(sopra)
    c, r1, r2 = S / 2, S * 0.36, S * 0.215
    w = max(2, int(S * 0.055))
    d.ellipse((c - r1, c - r1, c + r1, c + r1), outline=(255, 255, 255, 150), width=w)
    d.ellipse((c - r2, c - r2, c + r2, c + r2), fill=(255, 255, 255, 255))
    im = Image.alpha_composite(im, sopra)
    return im.resize((lato, lato), Image.LANCZOS)


def font(n, bold=True):
    for p in ("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, n)
    return ImageFont.load_default()


def immagine_grande(w, h):
    """Colonna a sinistra dell'installazione."""
    im = sfumatura(w, h, [(6, 30, 54), (13, 66, 117), (3, 105, 161)]).convert("RGBA")
    cerchi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(cerchi)
    for r, a in ((int(w * 0.95), 30), (int(w * 0.68), 40), (int(w * 0.42), 55)):
        d.ellipse((w * 0.85 - r, h * 0.12 - r, w * 0.85 + r, h * 0.12 + r), outline=(120, 210, 240, a), width=max(2, w // 90))
    im = Image.alpha_composite(im, cerchi)
    lg = logo(int(w * 0.42))
    im.alpha_composite(lg, (int(w * 0.12), int(h * 0.36)))
    d = ImageDraw.Draw(im)
    x = int(w * 0.12)
    d.text((x, int(h * 0.36) + lg.height + int(h * 0.04)), "Registra\nLezione", font=font(int(w * 0.13)), fill="white", spacing=int(w * 0.02))
    d.text((x, int(h * 0.86)), "by Punto Web Ferrara", font=font(int(w * 0.07), False), fill=(190, 220, 245))
    return im.convert("RGB")


def main():
    out = R / "grafica"
    out.mkdir(exist_ok=True)
    grande = logo(256)
    grande.save(R / "app" / "icona.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    grande.save(out / "logo-256.png")
    for k, (w, h) in enumerate(((164, 314), (246, 471), (328, 628), (410, 785))):
        immagine_grande(w, h).save(out / f"installa-{k}.bmp")
    for k, s in enumerate((55, 83, 110, 138)):
        bg = Image.new("RGB", (s, s), (255, 255, 255))
        bg.paste(logo(s), (0, 0), logo(s))
        bg.save(out / f"installa-piccola-{k}.bmp")
    print("fatto")


if __name__ == "__main__":
    main()
