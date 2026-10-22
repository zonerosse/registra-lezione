#!/bin/bash
# Prepara il "programma" dell'app Android (motore Python, pagine, guida, font) nella cartella $1
# e lo impacchetta anche in $2 (zip per l'aggiornamento leggero).
set -e
R=$1
rm -rf $R; mkdir -p $R
cp -R app/interfaccia app/_vendor $R/
for f in app/*.py; do
  case "$(basename $f)" in classica.py|prova_exe.py|registra_lezione.py|manca_edge.py) ;; *) cp $f $R/ ;; esac
done
cp app/nuvola_app.json $R/ 2>/dev/null || true       # identificativi del programma presso Google (cloud)
rm -f $R/interfaccia/mini.html
# sul telefono servono solo i video della guida del telefono (tel-*)
find $R/interfaccia/video -name '*.webm' ! -name 'tel-*' ! -name 'sm-tel-*' -delete 2>/dev/null || true
cp -R android/risorse/font $R/font
cp android/versione.json $R/versione_android.json
cp app/LICENZE.txt $R/
find $R -name __pycache__ -prune -exec rm -rf {} \;
if [ -n "$2" ]; then
  Z=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
  rm -f "$Z"; (cd $R && zip -qr -X "$Z" .)
fi
du -sh $R
