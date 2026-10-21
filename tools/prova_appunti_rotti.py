# -*- coding: utf-8 -*-
"""
Prova: appunti scritti male da Claude (liste scritte come testo JSON, testi al posto delle voci, risposte tagliate,
numeri come testo, campi mancanti...) in tutti i formati. Non deve rompersi niente: si sistemano da soli, il PDF
si fa e gli appunti giusti restano identici. La usa GitHub prima di ogni versione.
Uso:  python tools/prova_appunti_rotti.py      -> deve finire con "TUTTO A POSTO"
"""
import copy
import json
import random
import sys
import tempfile
import traceback
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE / "app"))
import appunti as ap        # noqa: E402
import ascolta              # noqa: E402

PAROLE = ["media", "varianza", "«il docente dice: è da esame»", "x̄ = Σxᵢ/n", "00:12:30", "slide 2, 00:25", "σ²",
          "[?] parola", "{a, b}", "[1, 2]"]


def gen(sc, rng):
    t = sc.get("type")
    if t == "object":
        return {k: gen(p, rng) for k, p in (sc.get("properties") or {}).items()
                if k in (sc.get("required") or []) or rng.random() < .8}
    if t == "array":
        return [gen(sc.get("items") or {"type": "string"}, rng) for _ in range(rng.randint(1, 4))]
    if t == "integer":
        return rng.randint(0, 3)
    if "hh:mm" in str(sc.get("description", "")):
        return "00:00:%02d" % rng.randint(1, 45)
    return " ".join(rng.choice(PAROLE) for _ in range(rng.randint(1, 4)))


def nodi(x, path=()):
    yield path, x
    if isinstance(x, dict):
        for k, v in x.items():
            yield from nodi(v, path + (k,))
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from nodi(v, path + (i,))


def metti(root, path, val):
    cur = root
    for p in path[:-1]:
        cur = cur[p]
    cur[path[-1]] = val


def muta(d, rng):
    d = copy.deepcopy(d)
    for _ in range(rng.randint(1, 4)):
        ns = [(p, v) for p, v in nodi(d) if p]
        if not ns:
            break
        p, v = rng.choice(ns)
        m = rng.randrange(11)
        val = [json.dumps(v, ensure_ascii=False), json.dumps(v, ensure_ascii=False)[:-3],
               v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)[:40], {"a": v, "b": "x"}, [v], None,
               rng.choice([3, 2.5, -1, 10 ** 12]), rng.choice(["", [], {}]), rng.choice([True, False]),
               [[v, "x"], ["y"]], {str(i): x for i, x in enumerate(v)} if isinstance(v, list) else v][m]
        metti(d, p, val)
    return d


def senza_vuoti(x):
    if isinstance(x, dict):
        return {k: senza_vuoti(v) for k, v in x.items()}
    if isinstance(x, list):
        return [senza_vuoti(v) for v in x if v not in ("", {}, None)]
    return x


def main():
    rng = random.Random(2026)
    errori = 0
    info = {"nome": "Prova", "inizio": "2026-10-21T14:13:00", "durata": 3600}
    with tempfile.TemporaryDirectory() as tmp:
        for formato, sc in ap.SCHEMI.items():
            cambiati = 0
            for i in range(150):
                buono = gen(sc, rng)
                buono["formato"] = formato
                if ap.ripara(copy.deepcopy(buono)) != senza_vuoti(buono):
                    cambiati += 1
                dati = muta(buono, rng)
                if i % 9 == 4:
                    dati = json.dumps(dati, ensure_ascii=False)
                try:
                    r = ap.ripara(dati)
                    assert ap.ripara(copy.deepcopy(r)) == r, "ripara non stabile"
                    if i % 3 == 0:
                        ap.pdf_appunti(copy.deepcopy(r), info, "parte 1", Path(tmp) / f"{formato}_{i}.pdf")
                    ap.normalizza(copy.deepcopy(r))
                    ascolta._sezioni(ap.normalizza(copy.deepcopy(r)), formato, "it")
                except Exception:
                    errori += 1
                    if errori < 6:
                        print(f"ERRORE {formato} #{i}:", json.dumps(dati, ensure_ascii=False)[:400])
                        traceback.print_exc()
            print(f"  {formato}: 150 appunti scritti male sistemati; appunti giusti cambiati: {cambiati}")
            errori += cambiati
    errori += casi()
    if errori:
        print("\nERRORI:", errori)
        sys.exit(1)
    print("\nTUTTO A POSTO")


def casi():
    """Casi veri, uno per uno."""
    import chiedi as ch
    sbagli = 0

    def ok(c, msg):
        nonlocal sbagli
        print(("  ok - " if c else "  NO - ") + msg)
        sbagli += 0 if c else 1
    print("Casi veri")
    b = [{"domanda": "Cos'è la media?", "appunti": ["somma / n"]}]
    r = ap.ripara({"titolo": "t", "blocchi": json.dumps(b), "riassunto": "r"})
    ok(r["blocchi"] == b, "blocchi scritti come testo JSON (il caso del 21/10): riletti")
    ok(ap.rotti({"titolo": "t", "blocchi": json.dumps(b)[:-6], "riassunto": "r"}), "blocchi tagliati: segnati da richiedere")
    ok(not ap.rotti({"titolo": "t", "blocchi": [], "riassunto": "pausa"}), "parte senza niente da dire: non e' rotta (come prima)")
    r = ap.ripara({"blocchi": [{"domanda": "q", "appunti": "[00:12] il docente spiega X"}]})
    ok(r["blocchi"][0]["appunti"] == ["[00:12] il docente spiega X"], "testo che comincia con [ resta")
    r = ap.ripara({"blocchi": b, "formulario": {"σ": "deviazione standard"}})
    ok(r["formulario"] == [{"simbolo": "σ", "significato": "deviazione standard"}], "formulario scritto come dizionario: il simbolo resta")
    r = ap.ripara({"formato": "esame", "domande_probabili": [{"domanda": "q", "schema": ["a"]}]})
    ok("stelle" not in r["domande_probabili"][0], "stelle mancanti: restano mancanti (il PDF mette 1 stella)")
    r = ap.ripara({"formato": "esame", "domande_probabili": [{"domanda": "q", "stelle": "3", "schema": "uno"}]})
    ok(r["domande_probabili"][0]["stelle"] == 3 and r["domande_probabili"][0]["schema"] == ["uno"], "«3» come testo diventa 3")
    sc = {"type": "object", "properties": {"domande": {"type": "array", "items": {"type": "object", "properties": {
        "domanda": {"type": "string"}, "giusta": {"type": "integer"}}, "required": ["domanda", "giusta"]}}}}
    r = ap.aggiusta({"domande": [{"domanda": "q"}, {"domanda": "q2", "giusta": "C"}]}, sc)
    ok(all("giusta" not in q for q in r["domande"]), "test a crocette senza risposta giusta: non diventa la A")
    r = ap.ripara('{\n  "titolo": "t",\n  "blocchi": [\n    {"domanda": "q", "appunti": ["a"]}\n  ]\n}')
    ok(r.get("blocchi") == [{"domanda": "q", "appunti": ["a"]}], "JSON con gli a capo (come lo scrive Claude): riletto")
    r = ap.ripara({"blocchi": {"Cos'è la media?": {"appunti": ["somma / n"]}}})
    ok(r["blocchi"][0]["domanda"] == "Cos'è la media?", "domande scritte come dizionario: la domanda resta")
    d = {"blocchi": [{"domanda": "q", "appunti": "[\"a\", \"b"}, {"domanda": "q2", "appunti": ["c"]}], "riassunto": "r"}
    ok(not ap.rotti(d) and ap.ripara(d)["blocchi"][1]["appunti"] == ["c"], "un pezzo tagliato dentro una domanda: le altre restano")
    corpo = {"tools": [{"name": "salva", "input_schema": {"type": "object", "properties": {"rami": {"type": "array", "items": {
        "type": "object", "properties": {"titolo": {"type": "string"}}, "required": ["titolo"]}}}}}]}
    risposte = [{"rami": "Il docente parla di statistica"}, {"rami": json.dumps([{"titolo": "Media"}])[:-4]},
                {"rami": [{"titolo": "Media"}]}]
    vecchio = ch._chiama
    ch._chiama = lambda chiave, c, tentativi=3: {"content": [{"type": "tool_use", "name": "salva", "input": risposte.pop(0)}]}
    try:
        d, _ = ch.strumento("k", corpo, "rami", "ap_vuoto")
        ok(d["rami"] == [{"titolo": "Media"}] and not risposte, "strumenti: testo semplice o lista tagliata -> si riprova")
    finally:
        ch._chiama = vecchio
    return sbagli


if __name__ == "__main__":
    main()
