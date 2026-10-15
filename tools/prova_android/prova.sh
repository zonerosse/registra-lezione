#!/bin/bash
# Sul telefono simulato: installa l'app di prova, fotografa la prima schermata, poi la fa lavorare da sola
# (scarica il riconoscitore e trascrive la finta lezione) e prende l'esito.
set -x
PKG=it.puntowebferrara.registralezione
DIR=/sdcard/Android/data/$PKG/files
OUT=prova_android_out
mkdir -p $OUT
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb shell getprop ro.product.cpu.abi > $OUT/abi.txt
adb shell am start -n $PKG/.Principale
sleep 6
adb exec-out screencap -p > $OUT/schermo_benvenuto.png
adb shell am force-stop $PKG
adb shell am start -n $PKG/.Principale --ez auto true
sleep 40
adb exec-out screencap -p > $OUT/schermo_scarico.png
for i in $(seq 1 300); do
  sleep 5
  if adb shell ls $DIR/esito.json >/dev/null 2>&1; then break; fi
done
adb pull $DIR/esito.json $OUT/esito.json
adb exec-out screencap -p > $OUT/schermo_fine.png
adb logcat -d | grep -iE "registralezione|whisper|AndroidRuntime" | tail -200 > $OUT/logcat.txt
cat $OUT/esito.json
true
