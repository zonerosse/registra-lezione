# -*- coding: utf-8 -*-
"""
Zip con password (AES-256, il formato «WinZip AES» che aprono 7-Zip, WinRAR, PeaZip e il Mac).

Serve a «Sincronizza anche fuori casa»: ogni lezione va nel cloud come uno zip chiuso, che Google o Microsoft
non possono aprire. Niente librerie in piu' (sul telefono non si possono aggiungere con l'aggiornamento leggero):
la cifratura AES e' fatta qui con numpy, a blocchi di 1 MB; il resto e' della libreria standard di Python
(zlib per comprimere, PBKDF2 e HMAC-SHA1 per la chiave e il controllo, come vuole il formato).

Formato (AE-2): per ogni file sale 16 byte + 2 byte di verifica della password + dati cifrati (AES-CTR, contatore
little-endian da 1) + 10 byte di HMAC-SHA1. Metodo 99 con il campo extra 0x9901.
"""
import hashlib
import hmac
import os
import struct
import time
import zlib

import numpy as np

# ---------------------------------------------------------------------------------------------------- AES

_SBOX = bytes.fromhex(
    "637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275"
    "09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cfd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2"
    "cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdbe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08"
    "ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9ee1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16")


def _xt(a):
    a <<= 1
    return (a ^ 0x11B) if a & 0x100 else a


def _tabelle():
    te0 = np.zeros(256, dtype=np.uint32)
    for i, s in enumerate(_SBOX):
        s2 = _xt(s)
        s3 = s2 ^ s
        te0[i] = (s2 << 24) | (s << 16) | (s << 8) | s3
    rot = lambda t, n: ((t >> np.uint32(n)) | (t << np.uint32(32 - n))).astype(np.uint32)
    return te0, rot(te0, 8), rot(te0, 16), rot(te0, 24), np.frombuffer(_SBOX, dtype=np.uint8).astype(np.uint32)


_TE0, _TE1, _TE2, _TE3, _S = _tabelle()


def _chiavi(chiave):
    """Espansione della chiave (AES-128/192/256): lista di parole a 32 bit."""
    nk = len(chiave) // 4
    nr = nk + 6
    w = [int.from_bytes(chiave[4 * i:4 * i + 4], "big") for i in range(nk)]
    rcon = 1
    for i in range(nk, 4 * (nr + 1)):
        t = w[i - 1]
        if i % nk == 0:
            t = ((t << 8) | (t >> 24)) & 0xFFFFFFFF
            t = (_SBOX[t >> 24] << 24) | (_SBOX[(t >> 16) & 255] << 16) | (_SBOX[(t >> 8) & 255] << 8) | _SBOX[t & 255]
            t ^= rcon << 24
            rcon = _xt(rcon)
        elif nk > 6 and i % nk == 4:
            t = (_SBOX[t >> 24] << 24) | (_SBOX[(t >> 16) & 255] << 16) | (_SBOX[(t >> 8) & 255] << 8) | _SBOX[t & 255]
        w.append(w[i - nk] ^ t)
    return np.array(w, dtype=np.uint32), nr


def _cifra_blocchi(s0, s1, s2, s3, rk, nr):
    """AES su molti blocchi insieme (ogni blocco = 4 parole big-endian)."""
    s0 = s0 ^ rk[0]
    s1 = s1 ^ rk[1]
    s2 = s2 ^ rk[2]
    s3 = s3 ^ rk[3]
    m = np.uint32(255)
    for r in range(1, nr):
        k = 4 * r
        t0 = _TE0[s0 >> 24] ^ _TE1[(s1 >> 16) & m] ^ _TE2[(s2 >> 8) & m] ^ _TE3[s3 & m] ^ rk[k]
        t1 = _TE0[s1 >> 24] ^ _TE1[(s2 >> 16) & m] ^ _TE2[(s3 >> 8) & m] ^ _TE3[s0 & m] ^ rk[k + 1]
        t2 = _TE0[s2 >> 24] ^ _TE1[(s3 >> 16) & m] ^ _TE2[(s0 >> 8) & m] ^ _TE3[s1 & m] ^ rk[k + 2]
        t3 = _TE0[s3 >> 24] ^ _TE1[(s0 >> 16) & m] ^ _TE2[(s1 >> 8) & m] ^ _TE3[s2 & m] ^ rk[k + 3]
        s0, s1, s2, s3 = t0, t1, t2, t3
    k = 4 * nr
    S = _S

    def ultima(a, b, c, d, kk):
        return ((S[a >> 24] << 24) | (S[(b >> 16) & m] << 16) | (S[(c >> 8) & m] << 8) | S[d & m]) ^ rk[kk]
    return ultima(s0, s1, s2, s3, k), ultima(s1, s2, s3, s0, k + 1), ultima(s2, s3, s0, s1, k + 2), ultima(s3, s0, s1, s2, k + 3)


def aes_blocco(chiave, blocco):
    """Un blocco solo (per le prove con i vettori ufficiali)."""
    rk, nr = _chiavi(chiave)
    w = [np.array([int.from_bytes(blocco[4 * i:4 * i + 4], "big")], dtype=np.uint32) for i in range(4)]
    out = _cifra_blocchi(*w, rk, nr)
    return b"".join(int(x[0]).to_bytes(4, "big") for x in out)


class _CTR:
    """AES-CTR come lo vuole WinZip: contatore di 128 bit little-endian che parte da 1."""

    def __init__(self, chiave):
        self.rk, self.nr = _chiavi(chiave)
        self.n = 1
        self.resto = b""

    def _flusso(self, nblocchi):
        c = np.arange(self.n, self.n + nblocchi, dtype=np.uint64)
        self.n += nblocchi
        basso = (c & np.uint64(0xFFFFFFFF)).astype(np.uint32).byteswap()      # i primi 4 byte (little-endian) letti big-endian
        alto = (c >> np.uint64(32)).astype(np.uint32).byteswap()
        zero = np.zeros(nblocchi, dtype=np.uint32)
        o = _cifra_blocchi(basso, alto, zero, zero.copy(), self.rk, self.nr)
        return np.stack(o, axis=1).astype(">u4").tobytes()

    def xor(self, dati):
        if not dati:
            return b""
        flusso = self.resto
        manca = len(dati) - len(flusso)
        if manca > 0:
            flusso += self._flusso((manca + 15) // 16)
        self.resto = flusso[len(dati):]
        a = np.frombuffer(dati, dtype=np.uint8)
        b = np.frombuffer(flusso[:len(dati)], dtype=np.uint8)
        return (a ^ b).tobytes()


def _derivate(password, sale):
    k = hashlib.pbkdf2_hmac("sha1", password.encode("utf-8"), sale, 1000, 32 * 2 + 2)
    return k[:32], k[32:64], k[64:]


# ---------------------------------------------------------------------------------------------------- scrivere

PEZZO = 1 << 20


def _dosdata(t):
    lt = time.localtime(t)
    if lt.tm_year < 1980:
        lt = time.localtime(315532800)
    return ((lt.tm_hour << 11) | (lt.tm_min << 5) | (lt.tm_sec // 2), ((lt.tm_year - 1980) << 9) | (lt.tm_mon << 5) | lt.tm_mday)


def scrivi(dest, voci, password, avanzamento=lambda f: None):
    """voci: [(nome nello zip, percorso o byte, data)]. Scrive dest (prima in .tmp, poi lo sostituisce)."""
    tmp = str(dest) + ".tmp"
    centrale = []
    tot = len(voci) or 1
    with open(tmp, "wb") as out:
        for i, (nome, sorgente, mt) in enumerate(voci):
            avanzamento(i / tot)
            nb = nome.replace("\\", "/").encode("utf-8")
            ora, data = _dosdata(mt or time.time())
            sale = os.urandom(16)
            kc, km, verifica = _derivate(password, sale)
            extra = struct.pack("<HHH2sBH", 0x9901, 7, 2, b"AE", 3, 8)
            off = out.tell()
            # intestazione provvisoria: le dimensioni si riscrivono alla fine del file
            testa = struct.pack("<IHHHHHIIIHH", 0x04034B50, 51, 0x0801, 99, ora, data, 0, 0, 0, len(nb), len(extra))
            out.write(testa + nb + extra)
            out.write(sale + verifica)
            ctr = _CTR(kc)
            mac = hmac.new(km, digestmod=hashlib.sha1)
            comp = zlib.compressobj(6, zlib.DEFLATED, -15)
            n_orig = 0
            n_comp = 0

            def manda(b):
                nonlocal n_comp
                if b:
                    c = ctr.xor(b)
                    mac.update(c)
                    out.write(c)
                    n_comp += len(c)
            if isinstance(sorgente, (bytes, bytearray)):
                n_orig = len(sorgente)
                manda(comp.compress(bytes(sorgente)))
            else:
                with open(sorgente, "rb") as fh:
                    for b in iter(lambda: fh.read(PEZZO), b""):
                        n_orig += len(b)
                        manda(comp.compress(b))
            manda(comp.flush())
            out.write(mac.digest()[:10])
            dim_comp = 16 + 2 + n_comp + 10
            fine = out.tell()
            out.seek(off + 18)
            out.write(struct.pack("<II", dim_comp, n_orig))
            out.seek(fine)
            centrale.append(struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 51, 51, 0x0801, 99, ora, data, 0, dim_comp, n_orig,
                                        len(nb), len(extra), 0, 0, 0, 0, off) + nb + extra)
        inizio = out.tell()
        for c in centrale:
            out.write(c)
        out.write(struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, len(centrale), len(centrale), out.tell() - inizio, inizio, 0))
    os.replace(tmp, dest)
    avanzamento(1.0)


# ---------------------------------------------------------------------------------------------------- leggere

class PasswordSbagliata(Exception):
    pass


def leggi(percorso, password, dove_scrivo):
    """Apre lo zip e per ogni file chiama dove_scrivo(nome, data) -> file aperto in scrittura (o None per saltarlo).
    Controlla l'HMAC di ogni file: se la password e' sbagliata o lo zip e' rovinato solleva un errore."""
    import zipfile
    with zipfile.ZipFile(percorso) as z, open(percorso, "rb") as fh:
        for info in z.infolist():
            if info.is_dir():
                continue
            fh.seek(info.header_offset)
            testa = fh.read(30)
            n_nome, n_extra = struct.unpack("<HH", testa[26:30])
            fh.seek(info.header_offset + 30 + n_nome + n_extra)
            mt = time.mktime(info.date_time + (0, 0, -1))
            if info.compress_type != 99:                      # file normale (es. LEGGIMI.txt)
                dati = z.read(info)
                dest = dove_scrivo(info.filename, mt)
                if dest:
                    with dest:
                        dest.write(dati)
                continue
            sale = fh.read(16)
            kc, km, verifica = _derivate(password, sale)
            if fh.read(2) != verifica:
                raise PasswordSbagliata(info.filename)
            resto = info.compress_size - 16 - 2 - 10
            ctr = _CTR(kc)
            mac = hmac.new(km, digestmod=hashlib.sha1)
            dec = zlib.decompressobj(-15)
            dest = dove_scrivo(info.filename, mt)
            try:
                while resto > 0:
                    b = fh.read(min(PEZZO, resto))
                    if not b:
                        raise IOError("zip troncato")
                    resto -= len(b)
                    mac.update(b)
                    d = dec.decompress(ctr.xor(b))
                    if dest:
                        dest.write(d)
                d = dec.flush()
                if dest:
                    dest.write(d)
                if not hmac.compare_digest(mac.digest()[:10], fh.read(10)):
                    raise PasswordSbagliata(info.filename)
            finally:
                if dest:
                    dest.close()
