# -*- coding: utf-8 -*-
"""
Prova gratuita e abbonamento (verbamanent.app/api/licenza).

Chi decide e' il sito, non il PC: la data di inizio della prova sta li', cosi' reinstallare non la fa ripartire.
Finche' Paolo non accende la prova nel pannello del sito, il sito risponde «libero» e il programma funziona come sempre.

  libero    nessuna prova: tutto come prima
  accedi    la prova e' accesa ma non si sa chi sei: «Accedi con Google e inizia» (lo stesso accesso di Sincronizza)
  prova     N giorni che restano: tutto si puo' fare, Claude con la propria chiave
  scaduta   le lezioni restano (leggere, ascoltare, ripassare); niente registrazioni, importazioni e appunti nuovi
  abbonato  famiglia o abbonato: tutto, e Claude compreso anche senza chiave (passa dal sito con l'accesso Google)

Senza internet vale l'ultima risposta del sito per GRAZIA giorni; poi chiede di collegarsi.
"""
import datetime
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request

log = logging.getLogger("registra_lezione")

SITO = os.environ.get("VM_SITO") or "https://verbamanent.app"
OGNI = 6 * 3600              # ogni quanto richiedere al sito
GRAZIA = 7                   # giorni senza internet che valgono ancora
CHIAVE_ABBONAMENTO = "sk-ant-verbamanent-abbonamento"   # non e' una chiave: dice «Claude dell'abbonamento»


def _get(percorso, token=None, tempo=15):
    h = {"User-Agent": "VerbaManentIA"}
    if token:
        h["X-VM-Google"] = token
    req = urllib.request.Request(SITO + percorso, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=tempo) as r:
            return json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8") or "{}")
        except Exception:
            raise e from None


class Licenza:
    def __init__(self, cfg, salva):
        self.cfg, self.salva = cfg, salva
        self._lock = threading.Lock()
        self._cloud = None
        self.accesso = ""            # "" | "in_corso" | "errore:..."

    # ------------------------------------------------------------------ chi sei (Google)
    def _google(self):
        """(refresh, email) dell'accesso Google: quello della licenza o quello di Sincronizza."""
        g = self.cfg.get("licenza_google") or {}
        if g.get("refresh"):
            return g["refresh"], g.get("email", "")
        n = self.cfg.get("nuvola") or {}
        if n.get("provider") == "google" and n.get("refresh"):
            return n["refresh"], n.get("email", "")
        return None, ""

    def token(self):
        import nuvola as nv
        refresh, _ = self._google()
        if not refresh:
            return None
        if not self._cloud or self._cloud.refresh != refresh:
            self._cloud = nv.Cloud.nuovo("google", refresh)
        try:
            return self._cloud.token()
        except Exception:
            log.exception("licenza: token")
            return None

    def accedi(self, apri, testi):
        """«Accedi con Google e inizia»: il browser si apre; qui si aspetta in un thread."""
        import nuvola as nv
        if self.accesso == "in_corso":
            return
        self.accesso = "in_corso"

        def lavora():
            try:
                r = nv.accedi("google", apri, testi)
                self.cfg["licenza_google"] = {"refresh": r["refresh"], "email": r["email"]}
                self.salva(self.cfg)
                self.accesso = ""
                self.controlla(forza=True)
            except Exception as e:
                log.exception("licenza: accesso")
                self.accesso = "errore:" + (str(e) if str(e) in ("annullato", "tempo") else "rete")
        threading.Thread(target=lavora, daemon=True).start()

    # ------------------------------------------------------------------ chiedere al sito
    def controlla(self, forza=False):
        """Chiede al sito (al massimo ogni OGNI secondi, salvo forza). Non solleva mai."""
        c = self.cfg.get("licenza") or {}
        if not forza and time.time() - float(c.get("controllato") or 0) < OGNI:
            return
        if not self._lock.acquire(blocking=False):
            return
        try:
            token = self.token()
            if token:
                r = _get("/api/licenza", token)
            else:
                r = _get("/api/licenza/prova")              # la prova e' accesa? (senza sapere chi sei)
                r = {"stato": "accedi" if r.get("attiva") else "libero", "giorni_prova": r.get("giorni")}
            if r.get("stato") == "accesso":
                r = {"stato": "accedi"}
            r["controllato"] = time.time()
            self.cfg["licenza"] = r
            self.salva(self.cfg)
        except Exception as e:
            log.warning("licenza: sito non raggiungibile (%s)", e)
        finally:
            self._lock.release()

    def controlla_dopo(self):
        threading.Thread(target=self.controlla, daemon=True).start()

    # ------------------------------------------------------------------ cosa si puo' fare
    def stato(self):
        """Per la pagina: {stato, giorni, fine, email, piano, offline, accesso}."""
        c = dict(self.cfg.get("licenza") or {})
        st = c.get("stato") or "libero"
        out = {"stato": st, "email": self._google()[1], "accesso": self.accesso,
               "giorni_prova": c.get("giorni_prova"), "piano": c.get("piano"), "tetto": c.get("tetto"), "usato": c.get("usato")}
        vecchio = time.time() - float(c.get("controllato") or 0)
        if st == "prova" and c.get("fine"):
            try:
                fine = datetime.datetime.fromisoformat(str(c["fine"]).replace("Z", "+00:00"))
                resta = (fine - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
                out["fine"] = c["fine"]
                if resta <= 0:
                    out["stato"] = "scaduta"
                else:
                    out["giorni"] = max(1, int(-(-resta // 86400)))
            except ValueError:
                pass
        elif st == "scaduta":
            out["fine"] = c.get("fine")
        if st in ("prova", "abbonato") and vecchio > GRAZIA * 86400:
            out["stato"], out["offline"] = "collegati", True      # troppo tempo senza internet: serve un controllo
        return out

    def bloccato(self):
        """True se non si possono creare lezioni nuove e appunti (prova finita, o da troppo tempo offline)."""
        return self.stato()["stato"] in ("scaduta", "collegati", "accedi")

    def messaggio(self):
        """Il testo da mostrare quando qualcosa e' bloccato."""
        from testi import tr
        return tr({"accedi": "lic_accedi", "collegati": "lic_collegati"}.get(self.stato()["stato"], "lic_bloccato"))

    def abbonato(self):
        return self.stato()["stato"] == "abbonato"
