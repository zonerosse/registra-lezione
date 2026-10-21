; Programma di installazione di Verba Manent IA (prima «Registra Lezione») (lo costruisce GitHub con Inno Setup).
; Installa nella cartella dell'utente, senza permessi di amministratore, cosi' il
; tasto Aggiorna puo' sostituire la cartella "app".

#ifndef Versione
  #define Versione "0.0"
#endif
; Edizione: "verba" = Verba Manent IA (predefinita), "scripta" = Scripta Manent (per chi ha un DSA).
; Stesso programma: Scripta Manent ha in piu' il file edizione.json accanto all'exe e la sua icona.
#ifndef Edizione
  #define Edizione "verba"
#endif
#if Edizione == "scripta"
  #define Nome "Scripta Manent"
  #define Cartella "ScriptaManent"
  #define Exe "Scripta Manent.exe"
  #define Icona "grafica\scripta\icona.ico"
#else
  #define Nome "Verba Manent IA"
  #define Cartella "RegistraLezione"
  #define Exe "Registra Lezione.exe"
  #define Icona "app\icona.ico"
#endif

[Setup]
#if Edizione == "scripta"
AppId={{A3F2C7E1-8B4D-4C9A-9E5F-2D7B1C6A8E42}
#else
AppId={{6C1E5D0B-3F1A-4E7C-9C2B-5A7D2E8F4B10}
#endif
AppName={#Nome}
AppVersion={#Versione}
AppPublisher=Punto Web Ferrara
AppCopyright=(C) 2026 Sara Boldrini - Punto Web Ferrara
AppPublisherURL=https://puntowebferrara.com/
AppSupportURL=https://puntowebferrara.com/contatti/
DefaultDirName={localappdata}\Programs\{#Cartella}
PrivilegesRequired=lowest
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
OutputDir=.
OutputBaseFilename={#Cartella}-Setup
SetupIconFile={#Icona}
UninstallDisplayIcon={app}\{#Exe}
UninstallDisplayName={#Nome}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ShowLanguageDialog=auto
#if Edizione != "scripta"
WizardImageFile=grafica\installa-0.bmp,grafica\installa-1.bmp,grafica\installa-2.bmp,grafica\installa-3.bmp
WizardSmallImageFile=grafica\installa-piccola-0.bmp,grafica\installa-piccola-1.bmp,grafica\installa-piccola-2.bmp,grafica\installa-piccola-3.bmp
#endif

[Languages]
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"; LicenseFile: "CONTRATTO-it.txt"
Name: "en"; MessagesFile: "compiler:Default.isl"; LicenseFile: "CONTRATTO-en.txt"

[CustomMessages]
it.Apri=Apri {#Nome}
en.Apri=Open {#Nome}

[InstallDelete]
; una reinstallazione rimette il codice del pacchetto, togliendo aggiornamenti a meta'
Type: filesandordirs; Name: "{app}\app"
Type: filesandordirs; Name: "{app}\app_nuova"
Type: filesandordirs; Name: "{app}\app_vecchia"
Type: filesandordirs; Name: "{app}\app_difettosa"
; i collegamenti col nome vecchio
Type: files; Name: "{userdesktop}\Registra Lezione.lnk"
Type: files; Name: "{userprograms}\Registra Lezione.lnk"

[Files]
Source: "dist\{#Cartella}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{userdesktop}\{#Nome}"; Filename: "{app}\{#Exe}"; WorkingDir: "{app}"
Name: "{userprograms}\{#Nome}"; Filename: "{app}\{#Exe}"; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#Exe}"; Description: "{cm:Apri}"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; le lezioni registrate restano in Documenti: qui si toglie solo il programma
Type: filesandordirs; Name: "{app}"
