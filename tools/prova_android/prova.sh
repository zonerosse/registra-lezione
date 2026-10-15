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
adb shell wm size 1080x2340; adb shell wm density 420     # come un telefono vero
adb shell am start -n $PKG/.Principale
sleep 30
adb exec-out screencap -p > $OUT/schermo_avvio.png
for i in $(seq 1 30); do PORTA=$(adb shell cat $DIR/porta.txt 2>/dev/null | tr -d '\r'); [ -n "$PORTA" ] && break; sleep 3; done
echo "porta del motore: $PORTA"
adb forward tcp:$PORTA tcp:$PORTA
timeout 4800 python3 tools/prova_android/prova_api.py $OUT $PORTA tools/prova_android/lezione_it.wav
timeout 30 adb exec-out screencap -p > $OUT/schermo_fine.png
timeout 60 adb shell ls -laR "\"$DIR/Documents\"" > $OUT/cartelle.txt
timeout 120 adb pull "$DIR/Documents" $OUT/documenti
grep -iE "registralezione|whisper|python|AndroidRuntime|chaquopy|lowmemory|killing|crash|FATAL" $OUT/logcat_tutto.txt | tail -600 > $OUT/logcat.txt
tail -300 $OUT/logcat_tutto.txt > $OUT/logcat_ultime.txt
pkill -f "adb logcat" || true
cat $OUT/esito_app.json
true
