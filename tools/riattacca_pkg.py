# -*- coding: utf-8 -*-
"""Dopo rcedit (icona e nome di Scripta Manent) l'exe perde l'archivio di PyInstaller attaccato in fondo.
Lo riprendo dall'exe originale e lo rimetto in fondo. Uso: python tools/riattacca_pkg.py originale.exe modificato.exe

L'archivio finisce con il «cookie» di PyInstaller: MAGIC (8 byte) + lunghezza del pacchetto (4 byte, big endian)...
Il pacchetto e' lungo quanto dice il cookie e sta proprio alla fine del file: il caricatore lo cerca dalla fine."""
import struct
import sys
from pathlib import Path

MAGIC = b"MEI\014\013\012\013\016"


def pacchetto(dati):
    """Il pacchetto di PyInstaller (dal suo inizio fino al cookie compreso, 88 byte)."""
    i = dati.rfind(MAGIC)
    if i < 0:
        raise SystemExit("archivio di PyInstaller non trovato")
    lung = struct.unpack("!I", dati[i + 8:i + 12])[0]
    fine = i + 88
    return dati[fine - lung:fine]


def main():
    orig, mod = Path(sys.argv[1]), Path(sys.argv[2])
    pkg = pacchetto(orig.read_bytes())
    nuovo = mod.read_bytes()
    if nuovo.rfind(MAGIC) >= 0 and nuovo.endswith(pkg):
        print("l'archivio c'e' gia'")
        return
    mod.write_bytes(nuovo + pkg)
    print(f"archivio riattaccato: {len(pkg)} byte")


if __name__ == "__main__":
    main()
