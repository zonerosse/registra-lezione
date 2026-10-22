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
adb shell wm size 720x1560; adb shell wm density 300     # proporzioni di un telefono vero
# il riconoscitore lo metto io: scaricarlo dentro il telefono simulato lo faceva staccare
adb shell mkdir -p $DIR
adb push ~/modello/ggml-small-q5_1.bin $DIR/ggml-small-q5_1.bin
[ -s ~/modello/voci_resnet34.onnx ] && adb push ~/modello/voci_resnet34.onnx $DIR/voci_resnet34.onnx
adb shell am start -n $PKG/.Principale
sleep 30
adb exec-out screencap -p > $OUT/schermo_avvio.png
for i in $(seq 1 30); do PORTA=$(adb shell cat $DIR/porta.txt 2>/dev/null | tr -d '\r'); [ -n "$PORTA" ] && break; sleep 3; done
echo "porta del motore: $PORTA"
if [ -z "$PORTA" ]; then echo "TELEFONO SIMULATO NON RISPONDE"; exit 3; fi      # il workflow riprova con un telefono nuovo
adb forward tcp:$PORTA tcp:$PORTA
timeout 4800 python3 tools/prova_android/prova_api.py $OUT $PORTA tools/prova_android/lezione_it.wav
timeout 30 adb exec-out screencap -p > $OUT/schermo_fine.png
timeout 60 adb shell ls -laR "\"$DIR/Documents\"" > $OUT/cartelle.txt
timeout 120 adb pull "$DIR/Documents" $OUT/documenti
grep -iE "registralezione|whisper|python|AndroidRuntime|chaquopy|lowmemory|killing|crash|FATAL" $OUT/logcat_tutto.txt | tail -600 > $OUT/logcat.txt
tail -300 $OUT/logcat_tutto.txt > $OUT/logcat_ultime.txt
pkill -f "adb logcat" || true
# Scripta Manent (la seconda edizione, stessa app con un altro nome): si installa accanto e deve partire come SM
SM=it.puntowebferrara.scriptamanent
SMDIR=/sdcard/Android/data/$SM/files
if [ -f android/app/build/outputs/apk/debug/app-scripta-debug.apk ]; then
  timeout 300 adb install -r -g android/app/build/outputs/apk/debug/app-scripta-debug.apk > $OUT/scripta.txt 2>&1
  adb shell am start -n $SM/it.puntowebferrara.registralezione.Principale >> $OUT/scripta.txt 2>&1
  for i in $(seq 1 40); do SP=$(adb shell cat $SMDIR/porta.txt 2>/dev/null | tr -d '\r'); [ -n "$SP" ] && break; sleep 3; done
  echo "porta di Scripta Manent: $SP" >> $OUT/scripta.txt
  if [ -n "$SP" ]; then
    adb forward tcp:$SP tcp:$SP
    curl -s -X POST -d '[]' http://127.0.0.1:$SP/api/pronto >> $OUT/scripta.txt 2>&1
  fi
  sleep 8; timeout 30 adb exec-out screencap -p > $OUT/schermo_scripta.png
fi
cat $OUT/esito_app.json
[ -f $OUT/esito_app.json ] || exit 3
grep -q "il motore risponde" $OUT/esito_app.json || exit 3
true
