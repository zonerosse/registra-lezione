package it.puntowebferrara.registralezione

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.concurrent.thread
import kotlin.math.sqrt

/**
 * Prova (prima tappa dell'app Android): registra qualche secondo dal microfono e trascrive sul telefono
 * una finta lezione (lezione_it.wav), con i modelli che trova nella cartella dell'app.
 * Scrive tutto in esito.json (cartella dell'app) e sullo schermo.
 */
class Principale : Activity() {
    private lateinit var testo: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        testo = TextView(this).apply { setPadding(32, 48, 32, 32); textSize = 15f }
        setContentView(ScrollView(this).apply { addView(testo) })
        scrivi("Registra Lezione · prova Android\n${Build.MANUFACTURER} ${Build.MODEL} · Android ${Build.VERSION.RELEASE}\n")
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 1)
        } else {
            avvia()
        }
    }

    override fun onRequestPermissionsResult(rc: Int, perms: Array<out String>, esiti: IntArray) {
        avvia()
    }

    private fun scrivi(s: String) = runOnUiThread { testo.append(s + "\n") }

    private fun avvia() = thread {
        val cartella = getExternalFilesDir(null)!!
        val esito = JSONObject()
        esito.put("telefono", "${Build.MANUFACTURER} ${Build.MODEL}")
        esito.put("android", Build.VERSION.RELEASE)
        esito.put("processori", Runtime.getRuntime().availableProcessors())
        try {
            esito.put("whisper", Whisper.info())
            esito.put("microfono", provaMicrofono())
            val wav = File(cartella, "lezione_it.wav")
            val campioni = leggiWav(wav)
            val sec = campioni.size / 16000.0
            scrivi("Lezione di prova: %.1f s".format(sec))
            val risultati = JSONArray()
            for (m in cartella.listFiles()!!.filter { it.name.startsWith("ggml-") }.sortedBy { it.length() }) {
                scrivi("Trascrivo con ${m.name}…")
                val t0 = System.currentTimeMillis()
                val righe = Whisper.trascrivi(m.absolutePath, campioni, "it", Runtime.getRuntime().availableProcessors())
                val dt = (System.currentTimeMillis() - t0) / 1000.0
                val solo = righe.lines().filter { it.contains("|") }.joinToString(" ") { it.substringAfterLast("|").trim() }
                scrivi("  %.1f s di lavoro per %.1f s di audio (x%.2f)\n  «%s»".format(dt, sec, dt / sec, solo.take(200)))
                risultati.put(JSONObject().put("modello", m.name).put("secondi_lavoro", dt).put("secondi_audio", sec)
                    .put("testo", solo))
            }
            esito.put("trascrizioni", risultati)
        } catch (e: Throwable) {
            esito.put("errore", e.toString())
            scrivi("ERRORE: $e")
        }
        File(cartella, "esito.json").writeText(esito.toString(2))
        scrivi("FATTO")
    }

    /** 4 secondi dal microfono: volume medio (in un telefono simulato di solito e' silenzio). */
    private fun provaMicrofono(): JSONObject {
        val rate = 16000
        val min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val rec = AudioRecord(MediaRecorder.AudioSource.MIC, rate, AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT, maxOf(min, rate))
        val o = JSONObject().put("stato", rec.state)
        if (rec.state != AudioRecord.STATE_INITIALIZED) return o.put("ok", false)
        val buf = ShortArray(rate * 4)
        rec.startRecording()
        var letti = 0
        while (letti < buf.size) {
            val n = rec.read(buf, letti, buf.size - letti)
            if (n <= 0) break
            letti += n
        }
        rec.stop(); rec.release()
        var somma = 0.0
        for (i in 0 until letti) somma += (buf[i] / 32768.0) * (buf[i] / 32768.0)
        val rms = if (letti > 0) sqrt(somma / letti) else 0.0
        scrivi("Microfono: %d campioni, volume %.4f".format(letti, rms))
        return o.put("ok", letti > 0).put("campioni", letti).put("volume", rms)
    }

    /** WAV 16 bit mono 16 kHz -> numeri decimali, come li vuole il riconoscitore. */
    private fun leggiWav(f: File): FloatArray {
        val raf = RandomAccessFile(f, "r")
        val byte = ByteArray(raf.length().toInt())
        raf.readFully(byte); raf.close()
        val bb = ByteBuffer.wrap(byte).order(ByteOrder.LITTLE_ENDIAN)
        var pos = 12
        while (pos + 8 <= byte.size) {
            val id = String(byte, pos, 4)
            val len = bb.getInt(pos + 4)
            if (id == "data") {
                val n = len / 2
                return FloatArray(n) { bb.getShort(pos + 8 + it * 2) / 32768f }
            }
            pos += 8 + len
        }
        return FloatArray(0)
    }
}
