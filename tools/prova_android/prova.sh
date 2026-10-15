#!/bin/bash
# Sul telefono simulato: installa l'app e la usa come una persona
# (prova_app.js, collegata alla pagina dentro l'app) e salva foto e risultati.
set -x
PKG=it.puntowebferrara.registralezione
DIR=/sdcard/Android/data/$PKG/files
OUT=$PWD/prova_android_out
mkdir -p $OUT
exec > >(tee $OUT/console.txt) 2>&1        # tutto quello che succede, da leggere dopo
adb wait-for-device; sleep 40   # il telefono simulato appena acceso e' ancora occupato
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
# tutto quello che il telefono scrive, anche se il telefono simulato si blocca a meta' prova
adb logcat -c; (adb logcat -v time > $OUT/logcat_tutto.txt 2>&1 &)
(set +x; while true; do sleep 60; echo "--- $(date +%T)"; adb devices; timeout 10 adb shell "cat /proc/meminfo | head -3; uptime"; done > $OUT/memoria.txt 2>&1 &)
adb shell getprop ro.product.cpu.abi > $OUT/abi.txt
adb shell dumpsys battery set ac 1
adb shell am start -n $PKG/.Principale
sleep 30
adb exec-out screencap -p > $OUT/schermo_avvio.png
PID=$(adb shell pidof $PKG | tr -d '\r')
adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s http://127.0.0.1:9222/json > $OUT/cdp.json; cat $OUT/cdp.json
adb devices -l
(cd tools/prova_android && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --silent playwright@1.47.2 >/dev/null 2>&1)
NODE_PATH=$PWD/tools/prova_android/node_modules timeout 3000 node tools/prova_android/prova_app.js $OUT
timeout 30 adb exec-out screencap -p > $OUT/schermo_fine.png
timeout 60 adb shell ls -laR "\"$DIR/Documents\"" > $OUT/cartelle.txt
timeout 120 adb pull "$DIR/Documents" $OUT/documenti
grep -iE "registralezione|whisper|python|AndroidRuntime|chaquopy|lowmemory|killing|crash|FATAL" $OUT/logcat_tutto.txt | tail -600 > $OUT/logcat.txt
tail -300 $OUT/logcat_tutto.txt > $OUT/logcat_ultime.txt
pkill -f "adb logcat" || true
cat $OUT/esito_app.json
true
