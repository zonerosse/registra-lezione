"""Avvia la parte Python dell'app Android con il telefono finto (java.py) e scrive la porta in SIM_PORTA."""
import os, sys, shutil, time
QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.abspath(os.path.join(QUI, "..", "..", ".."))
sys.path.insert(0, QUI)
sys.path.insert(0, os.path.join(RADICE, "android/app/src/main/python"))
RL = os.environ["SIM_RL"]
shutil.rmtree(RL, ignore_errors=True)
shutil.copytree(os.path.join(RADICE, "app"), RL, ignore=shutil.ignore_patterns("__pycache__"))
shutil.copytree(os.path.join(RADICE, "android/risorse/font"), RL + "/font")
import avvio_android as aa
porta = aa.avvia(RL, "it")
import android_motore
exec(open(os.path.join(QUI, "finto_claude.py")).read())          # Claude finto: niente chiave, niente costi
# un aggiornamento finto, per provare il bottone «Scarica»
def aa_cerca():
    tipo = (open(os.path.join(os.environ["SIM_DATI"], "agg_tipo.txt")).read().strip()
            if os.path.exists(os.path.join(os.environ["SIM_DATI"], "agg_tipo.txt")) else "apk")
    if tipo == "zip":      # aggiornamento leggero: solo i file del programma
        return {"versione": "0.7.1", "novita": "prova", "novita_en": "test", "completo": False, "contenuto": 99,
                "url_zip": "https://github.com/zonerosse/registra-lezione/raw/android-app/contenuto.zip"}
    return {"versione": "99.0", "novita": "prova", "novita_en": "test", "completo": True,
            "pagina": "https://github.com/zonerosse/registra-lezione/raw/android-app/RegistraLezione.apk"}
import aggiorna as agg
agg.cerca = aa_cerca
print("PORTA", porta, flush=True)
with open(os.environ["SIM_PORTA"], "w") as f:
    f.write(str(porta))
while True:
    time.sleep(3600)
