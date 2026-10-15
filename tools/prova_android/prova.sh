#!/bin/bash
# Sul telefono simulato: installa l'app, prepara una lezione "da trascrivere", poi la usa come una persona
# (prova_app.js, collegata alla pagina dentro l'app) e salva foto e risultati.
set -x
PKG=it.puntowebferrara.registralezione
DIR=/sdcard/Android/data/$PKG/files
DIRR=/data/media/0/Android/data/$PKG/files
OUT=$PWD/prova_android_out
mkdir -p $OUT
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb shell getprop ro.product.cpu.abi > $OUT/abi.txt
adb shell dumpsys battery set ac 1
adb root; sleep 5
U=$(adb shell cmd package list packages -U $PKG | sed 's/.*uid://' | tr -d '\r')
echo "uid app: $U"
# una lezione registrata con "Dopo", ancora da trascrivere (audio vero: 40 secondi in italiano)
L="$DIRR/Documents/Lezioni registrate/2026-10-14 0900 - Analisi 1 – Limiti"
adb shell mkdir -p "\"$L\""
adb push tools/prova_android/lezione_it.wav "$L/audio_001.wav"
echo '{"nome": "Analisi 1 – Limiti", "inizio": "2026-10-14T09:00:00", "durata": 40, "n_slide": 0, "stato": "da_completare", "pacchetti": {}, "parte_secondi": 1800, "lingua_appunti": "it", "lingua_lezione": "it", "modo": "aula", "parole": [], "quando": "dopo"}' > /tmp/info.json
adb push /tmp/info.json "$L/info.json"
adb shell chown -R $U:ext_data_rw "\"/data/media/0/Android/data/$PKG\""
adb shell chmod -R 771 "\"/data/media/0/Android/data/$PKG\""
adb shell ls -lan "\"$L\""
adb shell am start -n $PKG/.Principale
sleep 30
adb exec-out screencap -p > $OUT/schermo_avvio.png
PID=$(adb shell pidof $PKG | tr -d '\r')
adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s http://127.0.0.1:9222/json > $OUT/cdp.json; cat $OUT/cdp.json
(cd tools/prova_android && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --silent playwright@1.47.2 >/dev/null 2>&1)
NODE_PATH=$PWD/tools/prova_android/node_modules node tools/prova_android/prova_app.js $OUT
adb exec-out screencap -p > $OUT/schermo_fine.png
adb pull "$L/trascrizione_001.json" $OUT/trascrizione_dopo.json
adb shell ls -la "\"$L\"" > $OUT/cartella_dopo.txt
adb pull "$DIRR/Documents/Lezioni registrate/registra_lezione.log" $OUT/registra_lezione.log
adb logcat -d | grep -iE "registralezione|whisper|python|AndroidRuntime|chaquopy" | tail -400 > $OUT/logcat.txt
cat $OUT/esito_app.json
true
