# -*- coding: utf-8 -*-
"""
«Ascolta gli appunti»: gli appunti di una lezione come testo semplice da leggere ad alta voce
(titoli e punti, nell'ordine), per ogni formato che la lezione ha (Cornell, Formato Esame, verbale...).
Niente Claude, niente costi: si leggono i file appunti_*.json gia' fatti.

Torna {"formati": [{"formato", "titolo", "sezioni": [{"titolo", "punti": [...]}], "riassunto"}]}.
"""
from pathlib import Path

import appunti as ap
import elaborazione as el
import testi
from testi import tr


def _lista(x):
    if isinstance(x, list):
        return [str(v).strip() for v in x if str(v or "").strip()]
    return [str(x).strip()] if str(x or "").strip() else []


def _file(cartella, formato):
    cart = Path(cartella)
    if formato == "cornell":
        return sorted(cart.glob("appunti_[0-9]*.json"))
    return sorted(cart.glob(f"appunti_{formato}_[0-9]*.json"))


def _sezioni(d, formato, L):
    """Una parte degli appunti -> (titolo, sezioni, riassunto)."""
    sez, rias = [], ""
    if formato == "verbale":
        rias = str(d.get("in_breve") or "")
        dec = [x.get("testo", "") + (f" ({x['chi']})" if x.get("chi") else "") for x in d.get("decisioni") or [] if isinstance(x, dict)]
        az = [x.get("cosa", "") + (f" — {x['chi']}" if x.get("chi") else "") + (f", {x['entro']}" if x.get("entro") else "")
              for x in d.get("azioni") or [] if isinstance(x, dict)]
        aperte = [x.get("testo", "") for x in d.get("da_decidere") or [] if isinstance(x, dict)]
        for chiave, punti in (("vb_decisioni", dec), ("vb_azioni", az), ("vb_da_decidere", aperte)):
            if _lista(punti):
                sez.append({"titolo": tr(chiave, L), "punti": _lista(punti)})
        for p in d.get("sezioni_extra") or []:          # le sezioni del modello di riunione (es. condominio)
            if isinstance(p, dict) and _lista(p.get("punti")):
                sez.append({"titolo": str(p.get("titolo", "")), "punti": _lista(p.get("punti"))})
        for p in d.get("punti_discussi") or []:
            if isinstance(p, dict):
                sez.append({"titolo": str(p.get("titolo", "")), "punti": _lista(p.get("punti")) + _lista(p.get("aggiunte"))})
    elif formato == "mio":
        for s in d.get("sezioni") or []:
            if isinstance(s, dict):
                sez.append({"titolo": str(s.get("titolo", "")), "punti": _lista(s.get("punti")) + _lista(s.get("aggiunte"))})
        rias = str(d.get("riassunto") or "")
    else:
        d = ap.normalizza(d)
        if ap.e_esame(d):
            for q in d.get("domande_probabili") or []:
                if not isinstance(q, dict):
                    continue
                punti = _lista(q.get("schema")) + _lista(q.get("aggiunte"))
                kw = _lista(q.get("parole_chiave"))
                if kw:
                    punti.append(tr("cd_parole", L) + ": " + ", ".join(kw) + ".")
                if str(q.get("errore") or "").strip():
                    punti.append(tr("cd_errore", L) + ": " + str(q["errore"]).strip())
                sez.append({"titolo": str(q.get("domanda", "")), "punti": punti})
            kw = [f"{x.get('parola', '')}: {x.get('significato', '')}" for x in d.get("parole_chiave") or []
                  if isinstance(x, dict) and x.get("parola")]
            if kw:
                sez.append({"titolo": tr("cd_parole", L), "punti": kw})
        else:
            for b in d.get("blocchi") or []:
                if isinstance(b, dict):
                    sez.append({"titolo": str(b.get("domanda", "")), "punti": _lista(b.get("appunti")) + _lista(b.get("aggiunte"))})
            for e in d.get("esercizi_svolti") or []:
                if isinstance(e, dict):
                    sez.append({"titolo": tr("pdf_esercizi", L) + ": " + str(e.get("titolo", "")), "punti": _lista(e.get("passaggi"))})
            form = [f"{x.get('simbolo', '')}: {x.get('significato', '')}" for x in d.get("formulario") or []
                    if isinstance(x, dict) and x.get("simbolo")]
            if form:
                sez.append({"titolo": tr("cd_formulario", L), "punti": form})
            rias = str(d.get("riassunto") or "")
    return str(d.get("titolo") or ""), [s for s in sez if s["titolo"] or s["punti"]], rias


def appunti(cartella):
    cart = Path(cartella)
    info = el.leggi_json(cart / "info.json", {}) or {}
    L = testi.lingua_di(info)
    out = []
    for formato in ap.FORMATI:
        titolo, sezioni, riassunti = "", [], []
        for f in _file(cart, formato):
            d = el.leggi_json(f, {}) or {}
            if not isinstance(d, dict):
                continue
            t, s, r = _sezioni(d, formato, L)
            titolo = titolo or t
            sezioni += s
            if r.strip():
                riassunti.append(r.strip())
        if sezioni:
            out.append({"formato": formato, "titolo": titolo or info.get("nome", ""), "sezioni": sezioni,
                        "riassunto": " ".join(riassunti), "nome_mio": info.get("mio_nome") or ""})
    return {"formati": out, "lingua": L, "nome": info.get("nome", cart.name)}

