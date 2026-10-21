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

## Scripta Manent (edizione per chi ha un DSA)
Stesso programma, stesso aggiornamento: l'installazione di Scripta Manent mette accanto all'exe il file
`edizione.json` (`{"edizione": "scripta"}`), l'exe si chiama «Scripta Manent.exe» con la sua icona
(`grafica/scripta/icona.ico`, la disegna `tools/logo_scripta.py`). Il codice che cambia con l'edizione
sta in `app/edizione.py` (Python) e `app/interfaccia/scripta.js` (pagina). Impostazioni, cartella delle
lezioni e cartella nel cloud sono separate da quelle di Verba Manent IA.
Per provarla senza installare: `RL_EDIZIONE=scripta`.

https://github.com/zonerosse/registra-lezione/releases/latest/download/ScriptaManent-Setup.exe
