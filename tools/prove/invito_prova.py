# -*- coding: utf-8 -*-
"""Stampa un invito di prova (chiave finta), come quelli di Impostazioni › Inviti: serve alla prova dell'iPhone simulato."""
import ast
import base64
import hashlib
import json
import re
import zlib
from pathlib import Path

s = (Path(__file__).resolve().parents[2] / "app" / "motore.py").read_text(encoding="utf-8")
sale = ast.literal_eval(re.search(r"_SALE_INVITO\s*=\s*(b[\"'][^\"']*[\"'])", s).group(1))
d = zlib.compress(json.dumps({"v": 1, "da": "Prova", "per": "iPhone", "quando": "2026-10-20", "claude": "sk-ant-prova-finta"}).encode())
fl, i = b"", 0
while len(fl) < len(d):
    fl += hashlib.sha256(sale + i.to_bytes(4, "big")).digest()
    i += 1
print("VMIA-INVITO-1:" + base64.urlsafe_b64encode(bytes(a ^ b for a, b in zip(d, fl))).decode().rstrip("="))
