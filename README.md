# Registra Lezione

Programma per Windows che registra le lezioni seguite su Google Meet:
schermo, audio del PC e slide, poi trascrive il docente e prepara ogni ora
un pacchetto da mandare a Claude.

- `avvio.py` – lanciatore, diventa `Registra Lezione.exe`
- `dipendenze.py` – librerie da mettere dentro l'exe (`LIBRERIE` = versione delle librerie)
- `app/` – il programma vero, aggiornabile col tasto **Aggiorna**
- `app/versione.json` – numero di versione: cambiandolo, GitHub costruisce e pubblica la versione nuova
- `.github/workflows/costruisci-exe.yml` – costruzione automatica dell'exe su Windows
- `installer.iss` – programma di installazione (RegistraLezione-Setup.exe)
- `tools/prova.py` – prove automatiche (rilevamento slide, parti orarie, PDF, pacchetti)

## Pubblicare una versione nuova
1. Aumentare `versione` in `app/versione.json` e scrivere le `novita`.
2. Se sono cambiate le librerie (`requirements.txt` o `dipendenze.py`), aumentare anche
   `librerie` in `app/versione.json` **e** `LIBRERIE` in `dipendenze.py`: chi ha la versione
   vecchia dovrà riscaricare il pacchetto completo.
3. Push su `main`: GitHub costruisce l'exe, lo prova e pubblica la release.

## Scaricare
Ultima versione, sempre allo stesso link:
https://github.com/zonerosse/registra-lezione/releases/latest/download/RegistraLezione-Setup.exe
