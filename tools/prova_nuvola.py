# -*- coding: utf-8 -*-
"""
Prova di «Sincronizza anche fuori casa» (app/nuvola.py) con un cloud finto, senza internet.
  1. la cifratura AES-256 degli zip e' giusta (vettore ufficiale FIPS-197) e la password sbagliata si riconosce
  2. PC -> cloud -> telefono: la lezione arriva uguale
  3. nel cloud non si legge il nome della lezione: ne' nei nomi degli zip, ne' nei nomi dentro gli zip,
     ne' in indice.json (in chiaro restano solo la verifica della password e la versione)
  4. il cloud lasciato dalla versione 3.95 (zip col nome della lezione, indice in chiaro) viene migrato:
     la lezione arriva, gli zip vecchi spariscono, i nomi non si leggono piu'
Uso: python tools/prova_nuvola.py  (finisce con TUTTO A POSTO)
"""
import io
import json
import sys
import tempfile
import time
import zipfile
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE / "app"))

import nuvola as nv          # noqa: E402
import zip_aes as za         # noqa: E402

CHIAVE = "ABCD-EFGH-JKLM-NPQR"
SEGRETI = ["Diritto", "Storia", "privato", "Rivoluzione"]     # parole che nel cloud non si devono leggere


def controlla(cond, msg):
    print(("OK   " if cond else "ERRORE ") + msg)
    if not cond:
        sys.exit(1)


class CloudFinto(nv.Cloud):
    """Un Drive in memoria: {id: (nome, byte)}."""

    def __init__(self):
        super().__init__("finto")
        self.file = {}
        self.n = 0

    def token(self):
        return "finto"

    def cartella(self):
        return "radice", not self.file

    def elenco(self, cid):
        return {nome: {"id": fid, "s": len(b)} for fid, (nome, b) in self.file.items()}

    def _url_file(self, fid):
        return io.BytesIO(self.file[fid][1])

    def carica(self, cid, nome, sorgente, fid=None):
        b = bytes(sorgente) if isinstance(sorgente, (bytes, bytearray)) else Path(sorgente).read_bytes()
        if not fid:
            self.n += 1
            fid = "id%d" % self.n
        self.file[fid] = (nome, b)
        return {"id": fid}

    def elimina(self, fid):
        self.file.pop(fid)

    def nomi(self):
        return sorted(n for n, _ in self.file.values())

    def leggibile(self):
        """Tutto quello che chi guarda il Drive puo' leggere senza password: nomi dei file, nomi dentro gli zip,
        file in chiaro (indice.json, LEGGIMI.txt)."""
        testo = []
        for nome, b in self.file.values():
            testo.append(nome)
            if nome.endswith(".zip"):
                with zipfile.ZipFile(io.BytesIO(b)) as z:
                    testo += z.namelist()
            else:
                testo.append(b.decode("utf-8", "replace"))
        return "\n".join(testo)


def lezione(base, nome, testo):
    c = Path(base) / nome
    (c / "slide").mkdir(parents=True)
    (c / "info.json").write_text(json.dumps({"stato": "pronta", "nome": nome, "materia": nome.split(" ")[0]}),
                                 encoding="utf-8")
    (c / "appunti.json").write_text(json.dumps({"testo": testo}, ensure_ascii=False), encoding="utf-8")
    (c / "slide" / "s001.jpg").write_bytes(bytes(range(256)) * 400)
    return c


def giro(cloud, base, pac):
    return nv.giro(cloud, base, pac, {}, {}, CHIAVE, nome_disp="prova")


def uguali(a, b, nome):
    fa = sorted(p.relative_to(a).as_posix() for p in (Path(a) / nome).rglob("*") if p.is_file())
    fb = sorted(p.relative_to(b).as_posix() for p in (Path(b) / nome).rglob("*") if p.is_file())
    def stesso(r):
        x, y = (Path(a) / r).read_bytes(), (Path(b) / r).read_bytes()
        if r.endswith("info.json"):             # info.json viene riscritto (sincronizza._ripara_info): conta il contenuto
            return json.loads(x) == json.loads(y)
        return x == y
    return fa and fa == fb and all(stesso(r) for r in fa)


def prova_cifratura(t):
    k = bytes(range(32))
    controlla(za.aes_blocco(k, bytes.fromhex("00112233445566778899aabbccddeeff")).hex()
              == "8ea2b7ca516745bfeafc49904b496089", "AES-256 uguale al vettore ufficiale FIPS-197")
    f = t / "p.zip"
    za.scrivi(f, [("a.txt", "lezione àèì".encode() * 5000, time.time())], CHIAVE)
    pezzi = {}
    za.leggi(f, CHIAVE, lambda n, m: pezzi.setdefault(n, nv._Pezzo()))
    controlla(bytes(pezzi["a.txt"]) == "lezione àèì".encode() * 5000, "zip con password: si riapre uguale")
    try:
        za.leggi(f, "sbagliata", lambda n, m: nv._Pezzo())
        controlla(False, "password sbagliata riconosciuta")
    except za.PasswordSbagliata:
        controlla(True, "password sbagliata riconosciuta")


def prova_nomi_nascosti(t):
    pc, tel, pac = t / "pc", t / "tel", t / "pac"
    for d in (pc, tel, pac):
        d.mkdir()
    lezione(pc, "Diritto privato – 12 ottobre", "Il contratto è l'accordo di due o più parti")
    (pc / "esami").mkdir()
    (pc / "esami" / "Diritto privato.json").write_text(json.dumps({"data_esame": "2027-01-20"}), encoding="utf-8")
    cloud = CloudFinto()
    giro(cloud, pc, pac)
    vista = cloud.leggibile()
    controlla(not any(s in vista for s in SEGRETI), "nel cloud non si legge il nome della lezione")
    controlla(any(n.startswith("L-") for n in cloud.nomi()) and "indice.zip" in cloud.nomi(),
              "zip della lezione col codice e indice cifrato: " + ", ".join(cloud.nomi()))
    chiaro = json.loads(dict(cloud.file.values())["indice.json"])
    controlla(set(chiaro) == {"versione", "verifica"}, "indice.json in chiaro: solo versione e verifica")
    giro(cloud, tel, pac)
    controlla(uguali(pc, tel, "Diritto privato – 12 ottobre"), "la lezione arriva uguale sul telefono")
    controlla((tel / "esami" / "Diritto privato.json").exists(), "anche la materia (studio.zip) arriva sul telefono")
    try:
        nv.giro(cloud, t / "pac", pac, {}, {}, "AAAA-BBBB-CCCC-DDDD")
        controlla(False, "password diversa riconosciuta")
    except za.PasswordSbagliata:
        controlla(True, "password diversa riconosciuta")


def prova_migrazione(t):
    """Il cloud com'era con la 3.95: zip col nome della lezione e indice in chiaro."""
    vecchio, tel, pc, pac = t / "vecchio", t / "tel2", t / "pc2", t / "pac2"
    for d in (vecchio, tel, pc, pac):
        d.mkdir()
    u = "Storia – Rivoluzione francese"
    lezione(vecchio, u, "1789: presa della Bastiglia")
    files = nv.unita_locali(vecchio, pac, {}, {})[u]
    f = t / "vecchio.zip"
    voci = [(rel, str(vecchio / rel), m["m"]) for rel, m in sorted(files.items())]
    voci.append((nv.MANIFESTO, json.dumps({rel: m["m"] for rel, m in files.items()}).encode(), time.time()))
    za.scrivi(f, voci, CHIAVE)
    cloud = CloudFinto()
    cloud.carica("radice", nv.nome_vecchio(u), str(f))
    cloud.carica("radice", "indice.json", json.dumps({"versione": 1, "verifica": nv.verifica_di(CHIAVE),
                                                     "unita": {u: {"f": nv.firma(files), "m": 1, "da": "PC"}}}).encode())
    controlla(any(s in cloud.leggibile() for s in SEGRETI), "(prima) il cloud della 3.95 mostra il nome della lezione")
    giro(cloud, tel, pac)
    controlla(uguali(vecchio, tel, u), "migrazione: la lezione vecchia arriva sul telefono")
    controlla(not any(s in cloud.leggibile() for s in SEGRETI), "migrazione: il nome della lezione non si legge piu'")
    controlla(nv.nome_vecchio(u) not in cloud.nomi(), "migrazione: lo zip col nome vecchio e' stato cancellato")
    giro(cloud, pc, pac)
    controlla(uguali(vecchio, pc, u), "dopo la migrazione la lezione arriva anche sull'altro dispositivo")
    prima = sorted(cloud.file.items())
    giro(cloud, pc, pac)
    controlla(sorted(cloud.file.items()) == prima, "un giro senza novita' non cambia niente nel cloud")


def main():
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        prova_cifratura(t)
        prova_nomi_nascosti(t)
        prova_migrazione(t)
    print("\nTUTTO A POSTO")


if __name__ == "__main__":
    main()
