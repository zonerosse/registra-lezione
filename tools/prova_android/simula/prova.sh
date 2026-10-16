#!/bin/bash
# Prova dell'app Android senza emulatore (veloce e sicura): parte Python vera + pagine vere, telefono finto.
# Uso: bash tools/prova_android/simula/prova.sh CARTELLA_RISULTATI   (serve python con numpy, pillow, fpdf2, imageio-ffmpeg e node con playwright)
QUI=$(cd "$(dirname "$0")" && pwd)
OUT=$(mkdir -p "$1" && cd "$1" && pwd)
T=$(mktemp -d)
export SIM_DATI=$T/dati SIM_RL=$T/rl SIM_PORTA=$T/porta SIM_CARICA=1 SIM_VELOCITA=4 RL_PARTE_SECONDI=20 RL_PEZZO_SECONDI=5 RL_ATTESA_PEZZO=1 \
       SIM_WAV=$QUI/../lezione_it.wav PYTHON=${PYTHON:-python3}
(cd "$QUI/../../.." && bash tools/prova_android/prepara_rl.sh $T/zip_rl $T/contenuto.zip > /dev/null)
export SIM_ZIP=$T/contenuto.zip
$PYTHON "$QUI/../../prove/runpod_finto.py" 8799 > "$OUT/runpod_finto.txt" 2>&1 &      # «Sul server»: un RunPod finto
RF=$!
export RL_RUNPOD_API=http://127.0.0.1:8799/v2/
$PYTHON "$QUI/avvia.py" > "$OUT/motore.txt" 2>&1 &
PID=$!
for i in $(seq 1 60); do [ -s $SIM_PORTA ] && break; sleep 1; done
if [ ! -s $SIM_PORTA ]; then echo "il motore non parte:"; cat "$OUT/motore.txt"; kill $PID; exit 1; fi
node "$QUI/prova.js" "$(cat $SIM_PORTA)" "$OUT" "$SIM_DATI"
R=$?
kill $PID $RF 2>/dev/null
# all'avvio dopo l'aggiornamento leggero l'app deve scegliere i file nuovi
$PYTHON -c "import sys; sys.path.insert(0, '$QUI/../../../android/app/src/main/python'); import avvio_android as a; from pathlib import Path; ok = a._contenuto(Path('$T/rl_agg')) > a._contenuto(Path('$T/rl')); print(('ok  - ' if ok else 'NO  - ') + 'al riavvio usa i file nuovi'); sys.exit(0 if ok else 1)" || R=1
cp "$SIM_DATI"/Documents/*/registra_lezione.log "$OUT/" 2>/dev/null
rm -rf $T
exit $R
