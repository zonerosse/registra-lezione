// Registra Lezione per Mac - il pezzo scritto apposta per macOS.
//
// Usa ScreenCaptureKit (il sistema di Apple per registrare lo schermo) per prendere:
//   - l'audio del Mac (quello che si sente: Meet, Teams, Zoom...)  -> <cartella>/audio.f32 (mono, float 32 bit)
//   - lo schermo principale, alcune immagini al secondo             -> <cartella>/schermo/000123.jpg
// Su stdout scrive una riga per evento (letta dal programma in Python):
//   PRONTO <frequenza audio>      la registrazione e' partita
//   LIVELLO <0..1>                volume attuale (circa 10 volte al secondo)
//   FOTO <file> <secondi>         nuova immagine dello schermo
//   FINE                          registrazione chiusa bene
//   ERRORE <messaggio>
// Si ferma quando riceve una riga "STOP" su stdin (o dopo <secondi>, se indicati).
//
// uso: rl-cattura <cartella> [secondi] [--solo-audio] [--escludi-pid <pid>] [--ogni 2]

import AppKit
import CoreImage
import CoreMedia
import Foundation
import ScreenCaptureKit

setvbuf(stdout, nil, _IOLBF, 0)

func dici(_ s: String) {
    print(s)
    fflush(stdout)
}

let argomenti = CommandLine.arguments
guard argomenti.count >= 2 else {
    dici("ERRORE uso: rl-cattura <cartella> [secondi]")
    exit(1)
}
let cartella = URL(fileURLWithPath: argomenti[1])
let durata = argomenti.count > 2 ? Double(argomenti[2]) ?? 0 : 0
let soloAudio = argomenti.contains("--solo-audio")
var escludiPid: pid_t = -1
var fps: Int32 = 4
if let i = argomenti.firstIndex(of: "--escludi-pid"), i + 1 < argomenti.count { escludiPid = pid_t(argomenti[i + 1]) ?? -1 }
if let i = argomenti.firstIndex(of: "--fps"), i + 1 < argomenti.count { fps = Int32(argomenti[i + 1]) ?? 4 }
var ogni = 2.0      // ogni quanti secondi una foto dello schermo (per le slide)
if let i = argomenti.firstIndex(of: "--ogni"), i + 1 < argomenti.count { ogni = Double(argomenti[i + 1]) ?? 2.0 }

let fm = FileManager.default
try? fm.createDirectory(at: cartella.appendingPathComponent("schermo"), withIntermediateDirectories: true)

final class Cattura: NSObject, SCStreamOutput, SCStreamDelegate {
    let audio: FileHandle
    let ci = CIContext()
    var inizio: CMTime?
    var ultimaFoto = -1.0
    var ultimoLivello = Date.distantPast
    var campioni = 0
    var foto = 0
    var frequenza = 48000.0

    init(file: URL) {
        fm.createFile(atPath: file.path, contents: nil)
        audio = try! FileHandle(forWritingTo: file)
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        dici("ERRORE stream fermato: \(error.localizedDescription)")
        exit(3)
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
        guard sb.isValid else { return }
        switch type {
        case .audio: scriviAudio(sb)
        case .screen: scriviSchermo(sb)
        default: break
        }
    }

    func secondi(_ sb: CMSampleBuffer) -> Double {
        let t = CMSampleBufferGetPresentationTimeStamp(sb)
        if inizio == nil { inizio = t }
        return CMTimeGetSeconds(CMTimeSubtract(t, inizio!))
    }

    func scriviAudio(_ sb: CMSampleBuffer) {
        if let fd = CMSampleBufferGetFormatDescription(sb),
           let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(fd)?.pointee {
            frequenza = asbd.mSampleRate
        }
        var lista = AudioBufferList()
        var blocco: CMBlockBuffer?
        let st = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sb, bufferListSizeNeededOut: nil, bufferListOut: &lista,
            bufferListSize: MemoryLayout<AudioBufferList>.size, blockBufferAllocator: nil,
            blockBufferMemoryAllocator: nil, flags: 0, blockBufferOut: &blocco)
        guard st == noErr, let dati = lista.mBuffers.mData else { return }
        let n = Int(lista.mBuffers.mDataByteSize)
        audio.write(Data(bytes: dati, count: n))
        let valori = dati.bindMemory(to: Float.self, capacity: n / 4)
        var somma: Float = 0
        for i in 0..<(n / 4) { somma += valori[i] * valori[i] }
        campioni += n / 4
        if Date().timeIntervalSince(ultimoLivello) > 0.1 && n > 0 {
            ultimoLivello = Date()
            dici(String(format: "LIVELLO %.3f", min(1, sqrt(somma / Float(n / 4)) * 6)))
        }
    }

    func scriviSchermo(_ sb: CMSampleBuffer) {
        // solo le immagini complete (quando lo schermo e' fermo il sistema manda immagini "idle" vuote)
        if let att = CMSampleBufferGetSampleAttachmentsArray(sb, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
           let grezzo = att.first?[.status] as? Int, let stato = SCFrameStatus(rawValue: grezzo), stato != .complete {
            return
        }
        guard let pb = CMSampleBufferGetImageBuffer(sb) else { return }
        let t = secondi(sb)
        if t - ultimaFoto < 1.0 / Double(fps) { return }
        ultimaFoto = t
        let img = CIImage(cvPixelBuffer: pb)
        guard let cg = ci.createCGImage(img, from: img.extent) else { return }
        salvaFoto(cg, t)
    }

    func salvaFoto(_ cg: CGImage, _ t: Double) {
        foto += 1
        let nome = String(format: "%06d.jpg", foto)
        let url = cartella.appendingPathComponent("schermo").appendingPathComponent(nome)
        let rep = NSBitmapImageRep(cgImage: cg)
        if let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8]) {
            try? jpg.write(to: url)
            dici(String(format: "FOTO %@ %.2f", nome, t))
        }
    }
}

let cattura = Cattura(file: cartella.appendingPathComponent("audio.f32"))
var flusso: SCStream?

func avvia() async {
    do {
        let contenuto = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        guard let schermo = contenuto.displays.first else {
            dici("ERRORE nessuno schermo")
            exit(4)
        }
        // la mini finestra (e il programma stesso) non devono finire nel video
        let escluse = contenuto.applications.filter { $0.processID == escludiPid }
        let filtro = SCContentFilter(display: schermo, excludingApplications: escluse, exceptingWindows: [])
        let cfg = SCStreamConfiguration()
        cfg.width = schermo.width * 2 > 3840 ? schermo.width : schermo.width * 2
        cfg.height = schermo.width * 2 > 3840 ? schermo.height : schermo.height * 2
        cfg.minimumFrameInterval = CMTime(value: 1, timescale: fps)
        cfg.showsCursor = false
        cfg.capturesAudio = true
        cfg.sampleRate = 48000
        cfg.channelCount = 1
        cfg.excludesCurrentProcessAudio = true
        let s = SCStream(filter: filtro, configuration: cfg, delegate: cattura)
        let coda = DispatchQueue(label: "cattura")
        // il flusso serve per l'audio; lo schermo lo fotografo io a intervalli regolari (piu' affidabile:
        // il flusso manda immagini solo quando "pensa" che lo schermo sia cambiato)
        try s.addStreamOutput(cattura, type: .audio, sampleHandlerQueue: coda)
        try await s.startCapture()
        flusso = s
        dici("PRONTO \(Int(cattura.frequenza))")
        if !soloAudio {
            let t0 = Date()
            let cfgFoto = SCStreamConfiguration()
            cfgFoto.width = cfg.width
            cfgFoto.height = cfg.height
            cfgFoto.showsCursor = false
            Task.detached {
                while true {
                    let inizioGiro = Date()
                    if let cg = try? await SCScreenshotManager.captureImage(contentFilter: filtro, configuration: cfgFoto) {
                        cattura.salvaFoto(cg, Date().timeIntervalSince(t0))
                    }
                    let resto = ogni - Date().timeIntervalSince(inizioGiro)
                    if resto > 0 { try? await Task.sleep(nanoseconds: UInt64(resto * 1_000_000_000)) }
                }
            }
        }
    } catch {
        dici("ERRORE \(error.localizedDescription)")
        exit(5)
    }
}

func ferma() async {
    if let s = flusso { try? await s.stopCapture() }
    try? cattura.audio.close()
    let info: [String: Any] = ["frequenza": cattura.frequenza, "campioni": cattura.campioni, "foto": cattura.foto]
    if let j = try? JSONSerialization.data(withJSONObject: info) {
        try? j.write(to: cartella.appendingPathComponent("cattura.json"))
    }
    dici("FINE")
    exit(0)
}

Task {
    await avvia()
    if durata > 0 {
        try? await Task.sleep(nanoseconds: UInt64(durata * 1_000_000_000))
        await ferma()
    }
}
// fermata dal programma: una riga "STOP" su stdin (se non c'e' una durata)
if durata <= 0 { DispatchQueue.global().async {
    while let riga = readLine() {
        if riga.trimmingCharacters(in: .whitespaces) == "STOP" { break }
    }
    Task { await ferma() }
} }
dispatchMain()
