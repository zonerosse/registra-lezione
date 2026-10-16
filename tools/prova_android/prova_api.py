# -*- coding: utf-8 -*-
"""Prova dell'app Android vera sul telefono simulato: usa il motore dell'app come fa la pagina
(stesse chiamate /api/...), mentre lo schermo si fotografa con adb. Scrive esito_app.json."""
import json, subprocess, sys, time, urllib.request
OUT = sys.argv[1]
PORTA = int(sys.argv[2])
WAV = sys.argv[3]
DIR = "/sdcard/Android/data/it.puntowebferrara.registralezione/files"
esito = {"passi": [], "errori": []}


def salva():
    json.dump(esito, open(f"{OUT}/esito_app.json", "w"), ensure_ascii=False, indent=1)


def passo(n, ok, d=""):
    esito["passi"].append({"n": n, "ok": bool(ok), "d": str(d)[:1500], "ora": time.strftime("%H:%M:%S")})
    print(("ok  - " if ok else "NO  - ") + n + (f" ({str(d)[:300]})" if d else ""), flush=True)
    salva()


def api(nome, *args, t=120):
    r = urllib.request.Request(f"http://127.0.0.1:{PORTA}/api/{nome}", data=json.dumps(args).encode(), method="POST")
    with urllib.request.urlopen(r, timeout=t) as x:
        return json.loads(x.read())


def foto(n):
    with open(f"{OUT}/{n}.png", "wb") as f:
        subprocess.run(["timeout", "30", "adb", "exec-out", "screencap", "-p"], stdout=f)


def aspetta_fine(nome, max_s=2400):
    t0 = time.time()
    while time.time() - t0 < max_s:
        s = api("stato")
        if int(time.time() - t0) % 60 < 5:
            print("  …", json.dumps({"finale": s.get("finale"), "modello": s.get("modello"), "occupato": s.get("occupato"),
                                    "parti": s.get("parti")}, ensure_ascii=False), flush=True)
        if s.get("finale") == "ok" and not s.get("occupato"):
            return s, time.time() - t0
        time.sleep(5)
    return api("stato"), time.time() - t0


try:
    for i in range(60):
        try:
            if api("pronto").get("pronto"):
                break
        except Exception:
            pass
        time.sleep(2)
    r = api("riepilogo")
    passo("il motore risponde", True, f"versione {r.get('versione')}, lingua {r.get('lingua')}")
    api("imposta", "lingua", "it")
    api("imposta", "modo", "aula")
    subprocess.run(["adb", "shell", "input", "keyevent", "4"])      # tasto Indietro: chiude il benvenuto
    time.sleep(3); foto("01-pronto")

    # 1. lezione "Durante" dal microfono (silenzio sul telefono simulato)
    r = api("avvia", "Prova – Durante", {"modo": "aula", "quando": "durante"})
    passo("registrazione partita", r.get("ok"), r)
    time.sleep(20); foto("02-registro")
    s = api("stato")
    passo("registra (servizio Android)", s.get("registro") and s.get("secondi", 0) >= 10,
          f"secondi {s.get('secondi')}, batteria {s.get('batteria')}, avviso {s.get('avviso')!r}")
    time.sleep(20)
    api("fine")
    time.sleep(4); foto("03-fine-lavoro")
    s, dt = aspetta_fine("durante")
    foto("04-fine")
    passo("«Durante»: lezione pronta", s.get("finale") == "ok", f"{dt:.0f} s; parti {s.get('parti')}")

    # 2. lezione "Dopo": registra e basta
    api("nuova"); time.sleep(2)
    r = api("avvia", "Prova – Dopo", {"modo": "aula", "quando": "dopo"})
    time.sleep(25)
    api("fine"); time.sleep(5); foto("05-fine-dopo")
    s = api("stato")
    passo("«Dopo»: salvata senza trascrivere", s.get("finale") == "ok" and all(p.get("stato") == "dopo" for p in s.get("parti", [])),
          s.get("parti"))
    lz = api("lezioni")["lezioni"]
    dopo = [l for l in lz if l.get("dopo")]
    passo("«Trascrivi ora» sulla lezione «Dopo»", len(dopo) == 1, [(l["nome"], l["stato"], l.get("dopo")) for l in lz])
    if dopo:
        cart = dopo[0]["cartella"]
        # al posto del silenzio, 40 secondi di lezione vera in italiano
        rel = cart.split("/files/", 1)[1]
        p = subprocess.run(["adb", "push", WAV, f"{DIR}/{rel}/audio_001.wav"], capture_output=True, text=True)
        passo("audio di prova messo nella lezione", p.returncode == 0, (p.stdout + p.stderr).strip()[-300:])
        r = api("completa", cart)
        time.sleep(8); foto("06-trascrivo")
        s, dt = aspetta_fine("dopo")
        foto("07-pronta")
        passo("«Trascrivi ora» finito", s.get("finale") == "ok", f"{dt:.0f} s")
        subprocess.run(["adb", "pull", f"{DIR}/{rel}/trascrizione_001.json", f"{OUT}/trascrizione_dopo.json"])
        try:
            t = " ".join(x["testo"] for x in json.load(open(f"{OUT}/trascrizione_dopo.json")))
            passo("trascrizione in italiano", len(t) > 200, t[:400])
        except Exception as e:
            passo("trascrizione in italiano", False, e)
    lz = api("lezioni")["lezioni"]
    passo("Le mie lezioni", len(lz) >= 2, [(l["nome"], l["stato"]) for l in lz])

    # 3. le funzioni del PC sul telefono (parti nuove dell'app: onnxruntime, MediaExtractor/Muxer, sveglie)
    if dopo:
        cart = dopo[0]["cartella"]
        t0 = time.time()
        r = api("voci_rifai", cart, t=900)
        passo("chi parla (modello delle voci nell'app)", r.get("ok") and len(r.get("voci") or []) >= 1,
              f"{time.time() - t0:.0f} s; voci {[v.get('nome') or v.get('n') for v in r.get('voci') or []]}; {r.get('msg', '')}")
        r = api("spezzone", cart, 3, 15, True)
        passo("spezzone audio (pezzo copiato dal telefono)", r.get("ok"), r)
        st = api("statistiche", cart)
        passo("statistiche", st.get("durata", 0) > 0, st.get("durata_t"))
        r = api("cerca_parole", "lezione")
        passo("cerca nelle parole dette", "risultati" in r, len(r.get("risultati") or []))
    ora = time.localtime(time.time() + 40 * 60)
    fra = time.localtime(time.time() + 100 * 60)
    api("cal_orario", [{"giorno": ora.tm_wday, "dalle": time.strftime("%H:%M", ora), "alle": time.strftime("%H:%M", fra), "nome": "Fisica 1", "dove": "aula"}])
    sv = ""
    for i in range(16):
        time.sleep(6)
        sv = subprocess.run(["timeout", "30", "adb", "shell", "dumpsys", "alarm"], capture_output=True, text=True).stdout
        if "registralezione" in sv and "Sveglia" in sv:
            break
    righe = [x.strip() for x in sv.splitlines() if "registralezione" in x]
    passo("calendario: sveglia per la notifica", any("Sveglia" in x for x in sv.splitlines()) and righe, righe[:6])
except Exception as e:
    passo("errore nella prova", False, repr(e))
salva()
