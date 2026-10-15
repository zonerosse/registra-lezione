package it.puntowebferrara.registralezione

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.concurrent.thread
import kotlin.math.sqrt

/**
 * Registra Lezione per Android - versione di PROVA (da installare sul telefono vero).
 * 1. scarica il riconoscitore vocale (una volta sola, circa 190 MB)
 * 2. trascrive sul telefono una finta lezione di 40 secondi e misura quanto ci mette
 * 3. registra 10 secondi dal microfono e li trascrive
 * 4. mostra i risultati e li fa condividere (WhatsApp, email...)
 * Con l'extra "auto" (prove su GitHub) fa 1 e 2 da sola e scrive esito.json.
 */
class Principale : Activity() {
    private val modelloUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin"
    private val blu = Color.rgb(13, 66, 117)
    private lateinit var stato: TextView
    private lateinit var dettagli: TextView
    private lateinit var barra: ProgressBar
    private lateinit var bottone: Button
    private val esito = JSONObject()
    private var passo = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor = blu
        val dp = resources.displayMetrics.density
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.rgb(238, 244, 250)) }
        val testata = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(blu)
            setPadding((22 * dp).toInt(), (26 * dp).toInt(), (22 * dp).toInt(), (22 * dp).toInt())
        }
        testata.addView(TextView(this).apply { text = "Registra Lezione"; textSize = 24f; setTextColor(Color.WHITE); typeface = Typeface.DEFAULT_BOLD })
        testata.addView(TextView(this).apply { text = "Prova per Android · Punto Web Ferrara"; textSize = 13f; setTextColor(Color.rgb(170, 200, 230)) })
        col.addView(testata)
        val corpo = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding((20 * dp).toInt(), (20 * dp).toInt(), (20 * dp).toInt(), (20 * dp).toInt()) }
        stato = TextView(this).apply { textSize = 18f; setTextColor(Color.rgb(15, 27, 45)); typeface = Typeface.DEFAULT_BOLD }
        dettagli = TextView(this).apply { textSize = 15f; setTextColor(Color.rgb(38, 53, 74)); setPadding(0, (10 * dp).toInt(), 0, (16 * dp).toInt()); setLineSpacing(0f, 1.2f) }
        barra = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100; visibility = View.GONE }
        bottone = Button(this).apply {
            textSize = 17f; setTextColor(Color.WHITE); isAllCaps = false
            background = GradientDrawable().apply { cornerRadius = 14 * dp; setColor(Color.rgb(3, 105, 161)) }
            setPadding(0, (14 * dp).toInt(), 0, (14 * dp).toInt())
            setOnClickListener { avanti() }
        }
        corpo.addView(stato); corpo.addView(dettagli); corpo.addView(barra); corpo.addView(bottone)
        col.addView(ScrollView(this).apply { addView(corpo) }, LinearLayout.LayoutParams(-1, -1))
        setContentView(col)
        esito.put("telefono", "${Build.MANUFACTURER} ${Build.MODEL}")
        esito.put("android", Build.VERSION.RELEASE)
        esito.put("processori", Runtime.getRuntime().availableProcessors())
        mostra("Benvenuto!",
            "Questa è una prova di 5 minuti: serve a sapere quanto è veloce questo telefono a trascrivere le lezioni, " +
                "prima di costruire l'app vera.\n\n" +
                "1. Scarico il riconoscitore vocale (circa 190 MB, una volta sola: meglio col Wi-Fi)\n" +
                "2. Trascrivo una finta lezione di 40 secondi\n" +
                "3. Ti faccio leggere una frase al microfono\n\n" +
                "Tieni il telefono acceso, collegato al caricatore se puoi.",
            "Inizia la prova")
        if (intent.getBooleanExtra("auto", false)) {
            passo = 1
            thread { scarica(); trascriviLezione(); salva(); runOnUiThread { mostra("FATTO", esito.toString(2), null) } }
        }
    }

    private fun mostra(titolo: String, testo: String, bot: String?) = runOnUiThread {
        stato.text = titolo
        dettagli.text = testo
        bottone.visibility = if (bot == null) View.GONE else View.VISIBLE
        if (bot != null) bottone.text = bot
    }

    private fun avanti() {
        when (passo) {
            0 -> { passo = 1; thread { scarica(); trascriviLezione(); runOnUiThread { chiediMicrofono() } } }
            2 -> microfono()
            3 -> condividi()
        }
    }

    private fun modello() = File(getExternalFilesDir(null), "ggml-small-q5_1.bin")
    private fun threads() = minOf(4, Runtime.getRuntime().availableProcessors())

    private fun scarica() {
        val f = modello()
        if (f.exists() && f.length() > 150_000_000) return
        mostra("1 · Scarico il riconoscitore vocale…", "Circa 190 MB. Ci vuole qualche minuto.", null)
        runOnUiThread { barra.visibility = View.VISIBLE; barra.progress = 0 }
        val tmp = File(f.path + ".tmp")
        var url = URL(modelloUrl)
        var con: HttpURLConnection
        var giri = 0
        while (true) {      // segue i rimandi (huggingface -> server dei file)
            con = url.openConnection() as HttpURLConnection
            con.instanceFollowRedirects = false
            con.connectTimeout = 30000; con.readTimeout = 60000
            val c = con.responseCode
            if (c in 300..399 && giri++ < 8) { url = URL(url, con.getHeaderField("Location")); con.disconnect(); continue }
            break
        }
        val tot = con.contentLengthLong
        con.inputStream.use { inp ->
            tmp.outputStream().use { out ->
                val buf = ByteArray(1 shl 16)
                var letti = 0L
                var ultimo = -1
                while (true) {
                    val n = inp.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    letti += n
                    val p = if (tot > 0) (letti * 100 / tot).toInt() else 0
                    if (p != ultimo) { ultimo = p; runOnUiThread { barra.progress = p; dettagli.text = "Scaricato ${letti / 1_000_000} MB di ${tot / 1_000_000} MB" } }
                }
            }
        }
        tmp.renameTo(f)
        runOnUiThread { barra.visibility = View.GONE }
    }

    private fun trascriviLezione() {
        mostra("2 · Trascrivo la finta lezione…", "40 secondi di lezione sui limiti notevoli. Sto misurando quanto ci mette questo telefono: non chiudere l'app.", null)
        val wav = assets.open("lezione_it.wav").readBytes()
        val campioni = daWav(wav)
        val sec = campioni.size / 16000.0
        val t0 = System.currentTimeMillis()
        val righe = Whisper.trascrivi(modello().absolutePath, campioni, "it", threads())
        val dt = (System.currentTimeMillis() - t0) / 1000.0
        val testo = solo(righe)
        esito.put("lezione", JSONObject().put("secondi_audio", sec).put("secondi_lavoro", dt).put("testo", testo))
    }

    private fun chiediMicrofono() {
        passo = 2
        val l = esito.getJSONObject("lezione")
        val ora = l.getDouble("secondi_lavoro") / l.getDouble("secondi_audio") * 60
        mostra("3 · Ora tocca a te",
            "Trascrizione fatta in %.0f secondi: un'ora di lezione richiederebbe circa %.0f minuti su questo telefono.\n\n".format(l.getDouble("secondi_lavoro"), ora) +
                "Tocca il bottone e leggi ad alta voce, con calma:\n\n«Il teorema del confronto vale solo con gli angoli in radianti. Questo all'esame lo chiedo sempre.»",
            "Registra 10 secondi")
    }

    private fun microfono() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 1)
            return
        }
        passo = 9
        thread {
            mostra("🎤 Sto registrando… leggi la frase", "«Il teorema del confronto vale solo con gli angoli in radianti. Questo all'esame lo chiedo sempre.»", null)
            val rate = 16000
            val min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val rec = AudioRecord(MediaRecorder.AudioSource.MIC, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(min, rate))
            val buf = ShortArray(rate * 10)
            rec.startRecording()
            var letti = 0
            while (letti < buf.size) { val n = rec.read(buf, letti, buf.size - letti); if (n <= 0) break; letti += n }
            rec.stop(); rec.release()
            val f = FloatArray(letti) { buf[it] / 32768f }
            var s = 0.0
            for (x in f) s += x * x
            mostra("Trascrivo quello che hai detto…", "", null)
            val testo = solo(Whisper.trascrivi(modello().absolutePath, f, "it", threads()))
            esito.put("microfono", JSONObject().put("volume", if (letti > 0) sqrt(s / letti) else 0.0).put("testo", testo))
            salva()
            passo = 3
            val l = esito.getJSONObject("lezione")
            mostra("Fatto, grazie! ✓",
                "Hai detto: «$testo»\n\n" +
                    "Finta lezione: %.0f s di lavoro per %.0f s di audio.\n\n".format(l.getDouble("secondi_lavoro"), l.getDouble("secondi_audio")) +
                    "Tocca il bottone e manda i risultati a papà (WhatsApp va benissimo).",
                "Manda i risultati")
        }
    }

    override fun onRequestPermissionsResult(rc: Int, perms: Array<out String>, esiti: IntArray) {
        if (esiti.isNotEmpty() && esiti[0] == PackageManager.PERMISSION_GRANTED) microfono()
        else mostra("Serve il microfono", "Senza il permesso del microfono non posso fare l'ultima prova. Tocca di nuovo e scegli «Consenti».", "Registra 10 secondi")
    }

    private fun condividi() {
        val l = esito.getJSONObject("lezione")
        val m = esito.optJSONObject("microfono")
        val testo = "Registra Lezione · prova Android\n" +
            "Telefono: ${esito.getString("telefono")} · Android ${esito.getString("android")} · ${esito.getInt("processori")} processori\n" +
            "Finta lezione: %.1f s di lavoro per %.1f s di audio\n".format(l.getDouble("secondi_lavoro"), l.getDouble("secondi_audio")) +
            "Trascrizione: ${l.getString("testo")}\n" +
            (if (m != null) "Microfono (volume %.3f): ${m.getString("testo")}".format(m.getDouble("volume")) else "")
        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, testo) }, "Manda i risultati"))
    }

    private fun salva() = File(getExternalFilesDir(null), "esito.json").writeText(esito.toString(2))

    private fun solo(righe: String) = righe.lines().filter { it.contains("|") }.joinToString(" ") { it.substringAfterLast("|").trim() }

    /** WAV 16 bit mono 16 kHz -> numeri decimali, come li vuole il riconoscitore. */
    private fun daWav(byte: ByteArray): FloatArray {
        val bb = ByteBuffer.wrap(byte).order(ByteOrder.LITTLE_ENDIAN)
        var pos = 12
        while (pos + 8 <= byte.size) {
            val id = String(byte, pos, 4)
            val len = bb.getInt(pos + 4)
            if (id == "data") return FloatArray(len / 2) { bb.getShort(pos + 8 + it * 2) / 32768f }
            pos += 8 + len
        }
        return FloatArray(0)
    }
}
