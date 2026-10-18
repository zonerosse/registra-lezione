# -*- coding: utf-8 -*-
"""
«Podcast della lezione»: i punti importanti della lezione in pochi minuti, con una voce narrante che
collega i pezzi e, nei momenti chiave, LA VOCE VERA DEL DOCENTE presa dalla registrazione.

Claude (Haiku) sceglie la scaletta guardando la trascrizione con gli orari: frasi della voce narrante e
pezzi della lezione «da – a». Le parole dei pezzi del docente non le scrive Claude: le prendo qui dalla
trascrizione, cosi' sono proprio quelle dette. Niente voce artificiale che imita il docente.

Tre stili: «uno» (una voce narrante), «due» (Giulia fa le domande, Marco spiega) e «dibattito» (Giulia e Marco
sostengono due idee opposte su un punto della lezione, il prof fa da arbitro, alla fine cosa rispondere all'esame).
Le due voci sono due voci diverse del sistema (Windows / Mac / telefono); il prof e' sempre la sua voce vera.

Salvato in podcast_<breve|completo>[_dsa][_due|_dibattito].json. Il lettore e' nella finestra (voce narrante con la voce del
sistema, pezzi del docente dal video/audio della lezione); sul PC si puo' anche salvare un MP3.
"""
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import appunti as ap
import chiedi as ch
import elaborazione as el
import testi
from testi import tr

log = logging.getLogger("registra_lezione")

DURATE = {"breve": 8, "completo": 20}            # minuti, circa
SCHEMA = {"type": "object", "properties": {"pezzi": {"type": "array", "items": {"type": "object", "properties": {
    "tipo": {"type": "string", "enum": ["narratore", "prof", "a", "b"]},
    "testo": {"type": "string", "description": "per narratore, a, b: quello che dice quella voce"},
    "da": {"type": "string", "description": "solo per prof: hh:mm:ss di inizio, preso dalla trascrizione"},
    "a": {"type": "string", "description": "solo per prof: hh:mm:ss di fine, preso dalla trascrizione"}},
    "required": ["tipo"]}},
    "niente_dibattito": {"type": "boolean", "description": "solo per il dibattito: true se nella lezione non c'e' niente su cui avere idee diverse"}},
    "required": ["pezzi"]}
STILI = ("uno", "due", "dibattito")
NOMI = {"it": ("Giulia", "Marco"), "en": ("Emma", "Jack")}


def _sec(x):
    m = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", str(x or ""))
    if not m:
        return None
    a, b, c = m.group(1), m.group(2), m.group(3)
    return int(a) * 3600 + int(b) * 60 + int(c) if c is not None else int(a) * 60 + int(b)


def file_podcast(cartella, durata, dsa, stile="uno"):
    return Path(cartella) / f"podcast_{durata}{'_dsa' if dsa else ''}{'' if stile == 'uno' else '_' + stile}.json"


class NienteDibattito(Exception):
    pass


def crea(cartella, chiave, durata="breve", dsa=False, rifai=False, stile="uno"):
    """La scaletta del podcast. Torna (dati, spesa)."""
    cart = Path(cartella)
    durata = durata if durata in DURATE else "breve"
    stile = stile if stile in STILI else "uno"
    f = file_podcast(cart, durata, dsa, stile)
    gia = el.leggi_json(f) if not rifai else None
    if gia and gia.get("pezzi"):
        return gia, 0.0
    segs = ch.segmenti_lezione(cart)
    if not segs:
        raise ap.ErroreAppunti(tr("ch_vuoto"))
    info = el.leggi_json(cart / "info.json", {}) or {}
    L = testi.lingua_di(info)
    minuti = DURATE[durata]
    semplice = ("Frasi CORTE e SEMPLICI (massimo 15 parole l'una), una idea per frase, per uno studente con DSA. " if dsa else "")
    ga, ma = NOMI.get(L, NOMI["en"])
    prof = ("PEZZI VERI DELLA LEZIONE (\"prof\": il docente che spiega un punto importante, da 20 a 90 secondi, \"da\" e \"a\" "
            "presi ESATTAMENTE dagli orari della trascrizione, che inizino e finiscano con una frase completa). "
            "Scegli i momenti piu' importanti per l'esame (quando il docente insiste, definisce, fa un esempio). ")
    if stile == "uno":
        regia = ("Alterna la VOCE NARRANTE (\"narratore\": introduce, collega, riassume, in seconda persona, tono amichevole) e " + prof +
                 "Circa meta' del tempo deve essere la voce del docente. Comincia e finisci con la voce narrante (alla "
                 "fine un riassunto in 2-3 frasi). La voce narrante non inventa: dice solo cose della lezione. ")
    elif stile == "due":
        regia = ("E' una CHIACCHIERATA FRA DUE AMICI DI STUDIO: " + ga + " (\"a\") fa le domande che farebbe uno studente "
                 "(anche i dubbi tipici, \"li confondo sempre\"), " + ma + " (\"b\") spiega in modo semplice, con esempi e trucchi "
                 "per ricordare. Battute brevi e naturali (1-3 frasi), si danno del tu, si chiamano per nome ogni tanto. "
                 "Nei punti importanti si fermano e fanno parlare il prof: " + prof +
                 "Circa un terzo del tempo deve essere la voce del docente. Comincia " + ga + " presentando la lezione; alla fine " + ma +
                 " riassume in 2-3 frasi cosa sapere per l'esame. Non inventano: dicono solo cose della lezione. ")
    else:
        regia = ("E' un DIBATTITO FRA DUE STUDENTI su UN punto della lezione su cui si possono avere idee diverse (due teorie, due "
                 "interpretazioni, pro e contro, due scuole, una questione aperta di cui ha parlato il docente). " + ga + " (\"a\") "
                 "sostiene una tesi, " + ma + " (\"b\") quella opposta, con argomenti presi dalla lezione; battute brevi (1-3 frasi). "
                 "Il prof fa da arbitro: " + prof + "Alla fine " + ga + " e " + ma + " dicono insieme cosa rispondere all'esame "
                 "(la posizione del docente o come presentare le due tesi). Non inventano: solo cose della lezione. "
                 "Se nella lezione NON c'e' niente su cui avere idee diverse, metti niente_dibattito = true e un solo pezzo "
                 "\"narratore\" che dice in una frase perche'. ")
    corpo = {"model": ch.MODELLO, "max_tokens": 6000,
             "system": "Prepara il PODCAST di questa lezione registrata: circa " + str(minuti) + " minuti in tutto. " + regia + semplice +
                       "Scrivi in " + testi.nome_lingua(L, "it") + ". Chiama lo strumento salva_podcast.",
             "tools": [{"name": "salva_podcast", "description": "Salva il podcast.", "input_schema": SCHEMA}],
             "messages": [{"role": "user", "content": "TRASCRIZIONE CON GLI ORARI:\n" + ch.testo_lezione(cart)[:180_000]}]}
    dati, usage = ch.strumento(chiave, corpo, "pezzi", "pc_err")
    if stile == "dibattito" and (dati.get("niente_dibattito") is True or str(dati.get("niente_dibattito")).lower() == "true"):
        raise NienteDibattito()
    pezzi = []
    fine_lezione = max((float(s.get("fine") or s.get("inizio") or 0) for s in segs), default=0)
    for p in dati["pezzi"]:
        if p.get("tipo") == "prof":
            da, a = _sec(p.get("da")), _sec(p.get("a"))
            if da is None or a is None or a <= da or da > fine_lezione:
                continue
            a = min(a, da + 120)
            dentro = [s for s in segs if float(s["fine"]) > da and float(s["inizio"]) < a]
            if not dentro:
                continue
            # i confini sulle frasi vere: dall'inizio della prima frase alla fine dell'ultima
            da, a = float(dentro[0]["inizio"]), float(dentro[-1]["fine"])
            pezzi.append({"tipo": "prof", "da": round(da, 2), "a": round(a, 2),
                          "frasi": [{"inizio": round(float(s["inizio"]) - da, 2), "fine": round(float(s["fine"]) - da, 2),
                                     "testo": str(s.get("testo", "")).strip()} for s in dentro]})
        elif str(p.get("testo") or "").strip():
            tipo = p.get("tipo") if stile != "uno" and p.get("tipo") in ("a", "b") else ("a" if stile != "uno" else "narratore")
            pezzi.append({"tipo": tipo, "testo": str(p["testo"]).strip()[:1200]})
    if not any(p["tipo"] == "prof" for p in pezzi) or not any(p["tipo"] != "prof" for p in pezzi):
        raise ap.ErroreAppunti(tr("pc_err"))
    out = {"durata": durata, "dsa": bool(dsa), "pezzi": pezzi, "lingua": L, "stile": stile, "nomi": list(NOMI.get(L, NOMI["en"]))}
    el.scrivi_json(f, out)
    spesa = ch._costo(usage)
    el.aggiorna_info(cart, spesa_appunti=round(float(info.get("spesa_appunti") or 0) + spesa, 4))
    return out, spesa


# --------------------------------------------------------------------------- MP3 (sul PC)

def _voce_su_file(testo, dest, lingua="it", velocita=1.0, chi=0):
    """La voce narrante in un file WAV con la voce del sistema: Windows (SAPI) o Mac (say).
    chi: 0 = prima voce (Giulia, femminile se c'e'), 1 = seconda (Marco: un'altra voce, o la stessa piu' bassa)."""
    if sys.platform == "win32":
        rate = max(-10, min(10, int(round((velocita - 1) * 10))))
        # voci della lingua; la prima femminile per Giulia, la prima maschile per Marco; se ce n'e' una sola, Marco piu' basso
        ps = ("Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
              "$vv=@($s.GetInstalledVoices()|?{$_.Enabled -and $_.VoiceInfo.Culture.Name -like ($env:RL_LANG+'*')});"
              "$g=if($env:RL_CHI -eq '1'){'Male'}else{'Female'};"
              "$v=($vv|?{$_.VoiceInfo.Gender -eq $g}|select -First 1);if(-not $v){$v=$vv|select -First 1};"
              "if($v){$s.SelectVoice($v.VoiceInfo.Name)};$s.Rate=[int]$env:RL_RATE;$s.SetOutputToWaveFile($env:RL_OUT);"
              "$t=[IO.File]::ReadAllText($env:RL_TXT,[Text.Encoding]::UTF8);"
              "if($env:RL_CHI -eq '1' -and $v -and $v.VoiceInfo.Gender -ne 'Male'){$p=New-Object System.Speech.Synthesis.PromptBuilder;"
              "$p.AppendSsmlMarkup('<prosody pitch=\"x-low\">'+[Security.SecurityElement]::Escape($t)+'</prosody>');$s.Speak($p)}"
              "else{$s.Speak($t)};$s.Dispose()")
        txt = Path(dest).with_suffix(".txt")
        txt.write_text(testo, encoding="utf-8")
        env = dict(os.environ, RL_LANG="it" if lingua == "it" else "en", RL_RATE=str(rate), RL_OUT=str(dest), RL_TXT=str(txt), RL_CHI=str(chi))
        r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], env=env, creationflags=el.NO_WINDOW,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=300)
        return r.returncode == 0 and Path(dest).exists()
    if sys.platform == "darwin":
        voce = ["-v", ("Luca" if chi else "Alice") if lingua == "it" else ("Daniel" if chi else "Kate")]
        aiff = Path(dest).with_suffix(".aiff")
        r = subprocess.run(["say", *voce, "-r", str(int(175 * velocita)), "-o", str(aiff), testo],
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=300)
        if r.returncode != 0:
            return False
        r = subprocess.run([el.ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(aiff), str(dest)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        return r.returncode == 0
    return False


def mp3(cartella, dati, sorgente, dest, velocita=1.0, pausa_dopo_prof=0.0):
    """Il podcast in un unico file audio: voce narrante (voce del sistema) + pezzi veri della lezione."""
    ff = el.ffmpeg_exe()
    tmp = Path(tempfile.mkdtemp(prefix="podcast_"))
    try:
        pezzi = []
        for i, p in enumerate(dati["pezzi"]):
            out = tmp / f"{i:03d}.wav"
            if p["tipo"] != "prof":
                if not _voce_su_file(p["testo"], out, dati.get("lingua", "it"), velocita, 1 if p["tipo"] == "b" else 0) and \
                        not _voce_su_file(p["testo"], out, dati.get("lingua", "it"), velocita):
                    raise RuntimeError("voce narrante non disponibile")
            else:
                if not sorgente:
                    continue
                r = subprocess.run([ff, "-y", "-nostdin", "-loglevel", "error", "-ss", f"{p['da']:.2f}", "-t", f"{p['a'] - p['da']:.2f}",
                                    "-i", str(sorgente), "-vn", "-ac", "1", "-ar", "22050", str(out)],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
                if r.returncode != 0:
                    continue
                if pausa_dopo_prof:
                    pezzi.append((out, pausa_dopo_prof))
                    continue
            pezzi.append((out, 0))
        if not pezzi:
            raise RuntimeError("niente da unire")
        ingressi, filtri = [], []
        for k, (f, pausa) in enumerate(pezzi):
            ingressi += ["-i", str(f)]
            filtri.append(f"[{k}:a]aformat=sample_rates=22050:channel_layouts=mono" + (f",apad=pad_dur={pausa}" if pausa else "") + f"[a{k}]")
        filtro = ";".join(filtri) + ";" + "".join(f"[a{k}]" for k in range(len(pezzi))) + f"concat=n={len(pezzi)}:v=0:a=1[out]"
        Path(dest).parent.mkdir(parents=True, exist_ok=True)
        for codec in (["-c:a", "libmp3lame", "-b:a", "96k"], ["-c:a", "aac", "-b:a", "96k"]):
            d = Path(dest) if codec[1] == "libmp3lame" else Path(dest).with_suffix(".m4a")
            r = subprocess.run([ff, "-y", "-nostdin", "-loglevel", "error", *ingressi, "-filter_complex", filtro, "-map", "[out]", *codec, str(d)],
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=el.NO_WINDOW)
            if r.returncode == 0 and d.exists():
                return d
            log.warning("podcast: %s", r.stderr.decode("utf-8", "replace")[-400:])
        raise RuntimeError("ffmpeg non e' riuscito a unire il podcast")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
