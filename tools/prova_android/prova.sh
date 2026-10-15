#!/bin/bash
# Sul telefono simulato: installa l'app, le passa la lezione di prova e i modelli, la avvia e aspetta l'esito.
set -x
PKG=it.puntowebferrara.registralezione
DIR=/sdcard/Android/data/$PKG/files
OUT=prova_android_out
mkdir -p $OUT
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb shell mkdir -p $DIR
adb push tools/prova_android/lezione_it.wav $DIR/
for m in modelli/*.bin; do adb push "$m" $DIR/; done
adb shell getprop ro.product.cpu.abi > $OUT/abi.txt
adb shell am start -n $PKG/.Principale
for i in $(seq 1 240); do
  sleep 5
  if adb shell ls $DIR/esito.json >/dev/null 2>&1; then break; fi
done
adb pull $DIR/esito.json $OUT/esito.json
adb exec-out screencap -p > $OUT/schermo.png
adb logcat -d | grep -iE "registralezione|whisper|AndroidRuntime" | tail -200 > $OUT/logcat.txt
cat $OUT/esito.json
true
