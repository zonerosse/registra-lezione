; Programma di installazione di Registra Lezione (lo costruisce GitHub con Inno Setup).
; Installa nella cartella dell'utente, senza permessi di amministratore, cosi' il
; tasto Aggiorna puo' sostituire la cartella "app".

#ifndef Versione
  #define Versione "0.0"
#endif

[Setup]
AppId={{6C1E5D0B-3F1A-4E7C-9C2B-5A7D2E8F4B10}
AppName=Registra Lezione
AppVersion={#Versione}
AppPublisher=Punto Web Ferrara
AppPublisherURL=https://puntowebferrara.com/
AppSupportURL=https://puntowebferrara.com/contatti/
DefaultDirName={localappdata}\Programs\RegistraLezione
PrivilegesRequired=lowest
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
OutputDir=.
OutputBaseFilename=RegistraLezione-Setup
SetupIconFile=app\icona.ico
UninstallDisplayIcon={app}\Registra Lezione.exe
UninstallDisplayName=Registra Lezione
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
WizardImageFile=grafica\installa-0.bmp,grafica\installa-1.bmp,grafica\installa-2.bmp,grafica\installa-3.bmp
WizardSmallImageFile=grafica\installa-piccola-0.bmp,grafica\installa-piccola-1.bmp,grafica\installa-piccola-2.bmp,grafica\installa-piccola-3.bmp

[Languages]
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"

[InstallDelete]
; una reinstallazione rimette il codice del pacchetto, togliendo aggiornamenti a meta'
Type: filesandordirs; Name: "{app}\app"
Type: filesandordirs; Name: "{app}\app_nuova"
Type: filesandordirs; Name: "{app}\app_vecchia"
Type: filesandordirs; Name: "{app}\app_difettosa"

[Files]
Source: "dist\RegistraLezione\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{userdesktop}\Registra Lezione"; Filename: "{app}\Registra Lezione.exe"; WorkingDir: "{app}"
Name: "{userprograms}\Registra Lezione"; Filename: "{app}\Registra Lezione.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\Registra Lezione.exe"; Description: "Apri Registra Lezione"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; le lezioni registrate restano in Documenti: qui si toglie solo il programma
Type: filesandordirs; Name: "{app}"
