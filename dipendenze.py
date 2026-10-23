# -*- coding: utf-8 -*-
"""
Elenco delle librerie da mettere dentro l'exe.

Il codice del programma (cartella app) viene caricato a parte, quindi PyInstaller
non lo legge: tutto quello che il codice usa deve comparire qui.
LIBRERIE: aumentalo quando cambia questo elenco o requirements.txt. Gli exe con un
numero diverso non possono aggiornarsi col tasto Aggiorna: serve il pacchetto completo.
"""
import os

LIBRERIE = 2

# Moduli leggeri: importati davvero.
import base64, ctypes, datetime, html, importlib, io, json, logging, queue, re  # noqa: E401,F401
import shutil, ssl, subprocess, sys, tempfile, threading, time, traceback      # noqa: E401,F401
import urllib.request, warnings, wave, webbrowser, zipfile, hashlib             # noqa: E401,F401
import tkinter, tkinter.filedialog, tkinter.messagebox                          # noqa: E401,F401
from pathlib import Path                                                        # noqa: F401

# Moduli pesanti: PyInstaller li vede, ma all'avvio non vengono caricati
# (la condizione e' sempre falsa), cosi' il programma si apre subito.
if os.environ.get("RL_MAI_VERO_123"):
    import numpy                       # noqa: F401
    import PIL.Image, PIL.ImageDraw, PIL.ImageFont  # noqa: F401,E401
    import fontTools.subset            # noqa: F401
    import mss                         # noqa: F401
    import soundcard                   # noqa: F401
    import imageio_ffmpeg              # noqa: F401
    import fpdf                        # noqa: F401
    import faster_whisper              # noqa: F401
    import faster_whisper.utils        # noqa: F401
    import ctranslate2                 # noqa: F401
    import av                          # noqa: F401
    import onnxruntime                 # noqa: F401
    import huggingface_hub             # noqa: F401
    import tokenizers                  # noqa: F401
    import webview                     # noqa: F401  (finestra nuova con Edge WebView2)
    import webview.platforms.winforms  # noqa: F401
    import webview.platforms.edgechromium  # noqa: F401
    import clr                         # noqa: F401
    import clr_loader                  # noqa: F401
    import pythonnet                   # noqa: F401
    import bottle                      # noqa: F401
    import proxy_tools                 # noqa: F401

# Mac: la finestra con WebKit (pyobjc), i PDF disegnati e i link (yt-dlp come modulo)
if os.environ.get("RL_MAI_VERO_123") and sys.platform == "darwin":
    import webview.platforms.cocoa     # noqa: F401
    import pypdfium2                   # noqa: F401
    import yt_dlp                      # noqa: F401
