package it.puntowebferrara.registralezione

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.BatteryManager
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import java.io.File
import java.lang.ref.WeakReference
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Le cose del telefono che la parte in Python (motore, appunti, PDF...) chiede all'app:
 * aprire e condividere file, scegliere un file, batteria, scaricare il riconoscitore, notifiche.
 * Tutto statico: Python lo chiama con jclass("...Ponte").
 */
object Ponte {
    lateinit var app: Context
    var attivita: WeakReference<Activity> = WeakReference(null)

    @JvmStatic fun contesto(): Context = app
    @JvmStatic fun cartellaDati(): String = app.getExternalFilesDir(null)!!.absolutePath
    @JvmStatic fun cartellaCache(): String = app.cacheDir.absolutePath
    @JvmStatic fun versione(): String = app.packageManager.getPackageInfo(app.packageName, 0).versionName ?: "?"
    @JvmStatic fun codice(): Long = app.packageManager.getPackageInfo(app.packageName, 0).longVersionCode

    /** Riapre l'app da capo (dopo l'aggiornamento leggero: Python deve ricaricare i file nuovi). */
    @JvmStatic fun riavvia() {
        // una piccola attivita' in un processo a parte chiude questo e riapre l'app
        val i = Intent(app, Riavvio::class.java).putExtra("pid", android.os.Process.myPid())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        app.startActivity(i)
    }

    // ------------------------------------------------------------------ batteria
    private fun statoBatteria() = app.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    @JvmStatic fun inCarica(): Boolean {
        val s = statoBatteria()?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return s == BatteryManager.BATTERY_STATUS_CHARGING || s == BatteryManager.BATTERY_STATUS_FULL
    }
    @JvmStatic fun batteria(): Int {
        val i = statoBatteria() ?: return -1
        val l = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val sc = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
        return if (l < 0) -1 else l * 100 / sc
    }

    // ------------------------------------------------------------------ file
    private fun uri(f: File): Uri = FileProvider.getUriForFile(app, "it.puntowebferrara.registralezione.file", f)
    private fun tipo(f: File) = MimeTypeMap.getSingleton().getMimeTypeFromExtension(f.extension.lowercase()) ?: "*/*"

    /** Apre un file (PDF, video...) con l'app giusta del telefono. Una cartella: non si puo', si condivide. */
    @JvmStatic fun apri(percorso: String): Boolean {
        val f = File(percorso)
        if (!f.exists() || f.isDirectory) return false
        return try {
            val i = Intent(Intent.ACTION_VIEW).setDataAndType(uri(f), tipo(f))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            app.startActivity(Intent.createChooser(i, f.name).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            true
        } catch (e: Exception) { false }
    }

    /** Manda un file (WhatsApp, email, Drive...). */
    @JvmStatic fun condividi(percorso: String): Boolean {
        val f = File(percorso)
        if (!f.exists()) return false
        val i = Intent(Intent.ACTION_SEND).setType(tipo(f)).putExtra(Intent.EXTRA_STREAM, uri(f))
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        app.startActivity(Intent.createChooser(i, f.name).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return true
    }

    @JvmStatic fun apriLink(url: String) {
        app.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // scelta di un file: la pagina aspetta (Python resta fermo qui) finche' la persona sceglie
    private var scelta: CountDownLatch? = null
    private var scelto: String = ""
    const val SCEGLI = 41

    /** tipo: "video" (video o audio), "pdf" o "testo" (PDF, Word, .txt). Ritorna il percorso di una copia nella cache dell'app, o "". */
    @JvmStatic fun scegliFile(tipo: String): String {
        val a = attivita.get() ?: return ""
        val l = CountDownLatch(1)
        scelta = l
        scelto = ""
        a.runOnUiThread {
            val i = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            if (tipo == "pdf") i.type = "application/pdf"
            else if (tipo == "immagini") { i.type = "image/*"; i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true) }
            else if (tipo == "testo") {
                i.type = "*/*"
                i.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/pdf", "text/plain", "text/markdown",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
            }
            else { i.type = "*/*"; i.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("video/*", "audio/*")) }
            a.startActivityForResult(i, SCEGLI)
        }
        l.await(30, TimeUnit.MINUTES)
        return scelto
    }

    fun risultatoScelta(dati: Intent?) {
        // piu' immagini insieme (foto dei fogli): i percorsi uno per riga
        val clip = dati?.clipData
        if (clip != null && clip.itemCount > 0) {
            val dir = File(app.cacheDir, "scelti").apply { mkdirs() }
            val fatti = mutableListOf<String>()
            for (j in 0 until clip.itemCount) {
                try {
                    val uu = clip.getItemAt(j).uri
                    val dest = File(dir, "img_${System.currentTimeMillis()}_$j.jpg")
                    app.contentResolver.openInputStream(uu)!!.use { inp -> dest.outputStream().use { inp.copyTo(it) } }
                    fatti.add(dest.absolutePath)
                } catch (e: Exception) { }
            }
            scelto = fatti.joinToString("\n")
            scelta?.countDown()
            return
        }
        val u = dati?.data
        if (u != null) {
            try {
                var nome = "file"
                app.contentResolver.query(u, null, null, null, null)?.use { c ->
                    if (c.moveToFirst()) nome = c.getString(c.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME)) ?: nome
                }
                val dir = File(app.cacheDir, "scelti").apply { mkdirs() }
                val dest = File(dir, nome.replace("/", "_"))
                app.contentResolver.openInputStream(u)!!.use { inp -> dest.outputStream().use { inp.copyTo(it) } }
                scelto = dest.absolutePath
            } catch (e: Exception) { scelto = "" }
        }
        scelta?.countDown()
    }

    // ------------------------------------------------------------------ fotocamera (foto alla lavagna, fogli)
    const val SCATTA = 42
    private var scatto: CountDownLatch? = null
    @Volatile private var scattoOk = false

    /** Apre la fotocamera e aspetta la foto. Ritorna il percorso del file (o "" se annullata). */
    @JvmStatic fun scatta(): String {
        val a = attivita.get() ?: return ""
        val dir = File(app.cacheDir, "foto").apply { mkdirs() }
        val f = File(dir, "foto_${System.currentTimeMillis()}.jpg")
        val uri = androidx.core.content.FileProvider.getUriForFile(app, "it.puntowebferrara.registralezione.file", f)
        val l = CountDownLatch(1)
        scatto = l
        scattoOk = false
        a.runOnUiThread {
            try {
                val i = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                    .putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
                    .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                a.startActivityForResult(i, SCATTA)
            } catch (e: Exception) { l.countDown() }
        }
        l.await(15, TimeUnit.MINUTES)
        return if (scattoOk && f.exists() && f.length() > 0) f.absolutePath else ""
    }

    fun risultatoScatto(ok: Boolean) {
        scattoOk = ok
        scatto?.countDown()
    }

    // ------------------------------------------------------------------ QR del PC («Sincronizza»)
    /** Apre il lettore di QR di Google e aspetta. Ritorna il testo del QR, "" se annullato, "!" se il lettore non c'e'. */
    @JvmStatic fun leggiQr(): String {
        val a = attivita.get() ?: return "!"
        val l = CountDownLatch(1)
        var testo = "!"
        a.runOnUiThread {
            try {
                val opz = com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(com.google.mlkit.vision.barcode.common.Barcode.FORMAT_QR_CODE)
                    .enableAutoZoom()
                    .build()
                com.google.mlkit.vision.codescanner.GmsBarcodeScanning.getClient(a, opz).startScan()
                    .addOnSuccessListener { testo = it.rawValue ?: ""; l.countDown() }
                    .addOnCanceledListener { testo = ""; l.countDown() }
                    .addOnFailureListener { testo = "!"; l.countDown() }
            } catch (e: Throwable) { testo = "!"; l.countDown() }
        }
        l.await(5, TimeUnit.MINUTES)
        return testo
    }

    // ------------------------------------------------------------------ riconoscitore vocale
    @Volatile @JvmStatic var scaricati: Long = 0
    @Volatile @JvmStatic var totale: Long = 0

    /** Scarica un file grande (il riconoscitore, 190 MB) seguendo i rimandi. Ritorna "" se va bene. */
    @JvmStatic fun scarica(indirizzo: String, dest: String): String {
        return try {
            var url = URL(indirizzo)
            var con: HttpURLConnection
            var giri = 0
            while (true) {
                con = url.openConnection() as HttpURLConnection
                con.instanceFollowRedirects = false
                con.connectTimeout = 30000; con.readTimeout = 60000
                val c = con.responseCode
                if (c in 300..399 && giri++ < 8) { url = URL(url, con.getHeaderField("Location")); con.disconnect(); continue }
                if (c != 200) return "HTTP $c"
                break
            }
            totale = con.contentLengthLong
            scaricati = 0
            val tmp = File("$dest.tmp")
            con.inputStream.use { inp ->
                tmp.outputStream().use { out ->
                    val buf = ByteArray(1 shl 16)
                    while (true) { val n = inp.read(buf); if (n < 0) break; out.write(buf, 0, n); scaricati += n }
                }
            }
            if (!tmp.renameTo(File(dest))) return "rename"
            ""
        } catch (e: Exception) { e.toString() }
    }

    // ------------------------------------------------------------------ slide del docente (PDF -> immagini)
    /** Disegna ogni pagina in cartella/p001.png ... larga `larghezza` pixel. Ritorna quante pagine. */
    @JvmStatic fun pdfInPng(pdf: String, cartella: String, larghezza: Int): Int {
        return try {
            val fd = android.os.ParcelFileDescriptor.open(File(pdf), android.os.ParcelFileDescriptor.MODE_READ_ONLY)
            val r = android.graphics.pdf.PdfRenderer(fd)
            for (i in 0 until r.pageCount) {
                val p = r.openPage(i)
                val h = maxOf(1, (larghezza.toLong() * p.height / maxOf(1, p.width)).toInt())
                val bmp = android.graphics.Bitmap.createBitmap(larghezza, h, android.graphics.Bitmap.Config.ARGB_8888)
                bmp.eraseColor(android.graphics.Color.WHITE)
                p.render(bmp, null, null, android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                p.close()
                File(cartella, "p%03d.png".format(i + 1)).outputStream().use { bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
                bmp.recycle()
            }
            val n = r.pageCount
            r.close(); fd.close()
            n
        } catch (e: Exception) { 0 }
    }

    // ------------------------------------------------------------------ audio della lezione
    /** Unisce le parti WAV (16 kHz mono) in un solo file audio.m4a (AAC, molto piu' piccolo). */
    @JvmStatic fun unisciAudio(wavs: Array<String>, uscita: String): Boolean {
        val tmp = File("$uscita.tmp")
        try {
            val rate = 16000
            val fmt = android.media.MediaFormat.createAudioFormat(android.media.MediaFormat.MIMETYPE_AUDIO_AAC, rate, 1)
            fmt.setInteger(android.media.MediaFormat.KEY_AAC_PROFILE, android.media.MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            fmt.setInteger(android.media.MediaFormat.KEY_BIT_RATE, 48000)
            fmt.setInteger(android.media.MediaFormat.KEY_MAX_INPUT_SIZE, 16384)
            val cod = android.media.MediaCodec.createEncoderByType(android.media.MediaFormat.MIMETYPE_AUDIO_AAC)
            cod.configure(fmt, null, null, android.media.MediaCodec.CONFIGURE_FLAG_ENCODE)
            cod.start()
            val mux = android.media.MediaMuxer(tmp.path, android.media.MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            var traccia = -1
            val info = android.media.MediaCodec.BufferInfo()
            var campioni = 0L
            var fineIngresso = false
            var fine = false
            val file = wavs.map { File(it) }.filter { it.length() > 44 }
            var fi = 0
            var ingresso: java.io.InputStream? = null
            val buf = ByteArray(8192)
            while (!fine) {
                if (!fineIngresso) {
                    val i = cod.dequeueInputBuffer(10000)
                    if (i >= 0) {
                        var n = -1
                        while (n <= 0 && !fineIngresso) {
                            if (ingresso == null) {
                                if (fi >= file.size) { fineIngresso = true; break }
                                ingresso = java.io.BufferedInputStream(file[fi++].inputStream()); ingresso.skip(44)
                            }
                            n = ingresso.read(buf, 0, buf.size)
                            if (n <= 0) { ingresso.close(); ingresso = null }
                        }
                        val t = campioni * 1_000_000L / rate
                        if (fineIngresso) cod.queueInputBuffer(i, 0, 0, t, android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        else {
                            val b = cod.getInputBuffer(i)!!; b.clear(); b.put(buf, 0, n)
                            cod.queueInputBuffer(i, 0, n, t, 0)
                            campioni += n / 2
                        }
                    }
                }
                val o = cod.dequeueOutputBuffer(info, 10000)
                if (o == android.media.MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) { traccia = mux.addTrack(cod.outputFormat); mux.start() }
                else if (o >= 0) {
                    val b = cod.getOutputBuffer(o)!!
                    if (info.flags and android.media.MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) info.size = 0
                    if (info.size > 0 && traccia >= 0) { b.position(info.offset); b.limit(info.offset + info.size); mux.writeSampleData(traccia, b, info) }
                    cod.releaseOutputBuffer(o, false)
                    if (info.flags and android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) fine = true
                }
            }
            cod.stop(); cod.release()
            mux.stop(); mux.release()
            return tmp.renameTo(File(uscita))
        } catch (e: Exception) {
            android.util.Log.e("RegistraLezione", "audio m4a", e)
            tmp.delete()
            return false
        }
    }

    // ------------------------------------------------------------------ chiave di Claude, protetta dal telefono
    private const val ALIAS = "chiave_claude"
    private fun chiaveAes(): javax.crypto.SecretKey {
        val ks = java.security.KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? javax.crypto.SecretKey)?.let { return it }
        val g = javax.crypto.KeyGenerator.getInstance(android.security.keystore.KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        g.init(android.security.keystore.KeyGenParameterSpec.Builder(ALIAS,
            android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build())
        return g.generateKey()
    }
    @JvmStatic fun cifra(testo: String): String {
        val c = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
        c.init(javax.crypto.Cipher.ENCRYPT_MODE, chiaveAes())
        val d = c.doFinal(testo.toByteArray(Charsets.UTF_8))
        return android.util.Base64.encodeToString(c.iv + d, android.util.Base64.NO_WRAP)
    }
    @JvmStatic fun decifra(dati: String): String {
        return try {
            val b = android.util.Base64.decode(dati, android.util.Base64.NO_WRAP)
            val c = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
            c.init(javax.crypto.Cipher.DECRYPT_MODE, chiaveAes(), javax.crypto.spec.GCMParameterSpec(128, b, 0, 12))
            String(c.doFinal(b, 12, b.size - 12), Charsets.UTF_8)
        } catch (e: Exception) { "" }
    }

    // ------------------------------------------------------------------ email (Gmail o l'app di posta del telefono)
    /** Email pronta: destinatari, oggetto, testo e allegati. La persona preme Invia. */
    @JvmStatic fun email(dest: Array<String>, oggetto: String, testo: String, allegati: Array<String>): Boolean {
        val file = allegati.map { File(it) }.filter { it.exists() }
        val uris = ArrayList(file.map { uri(it) })
        val i = if (uris.size > 1) Intent(Intent.ACTION_SEND_MULTIPLE).putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                else Intent(Intent.ACTION_SEND).also { if (uris.size == 1) it.putExtra(Intent.EXTRA_STREAM, uris[0]) }
        i.type = if (uris.isEmpty()) "text/plain" else "application/octet-stream"
        if (uris.isNotEmpty()) {     // il permesso di leggere gli allegati passa con ClipData
            val clip = android.content.ClipData.newRawUri("", uris[0])
            for (u in uris.drop(1)) clip.addItem(android.content.ClipData.Item(u))
            i.clipData = clip
        }
        i.putExtra(Intent.EXTRA_EMAIL, dest).putExtra(Intent.EXTRA_SUBJECT, oggetto).putExtra(Intent.EXTRA_TEXT, testo)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        // solo le app di posta (Gmail, Outlook...)
        i.selector = Intent(Intent.ACTION_SENDTO).setData(Uri.parse("mailto:"))
        return try {
            app.startActivity(i); true
        } catch (e: Exception) {
            try {
                i.selector = null
                app.startActivity(Intent.createChooser(i, oggetto).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true
            } catch (e2: Exception) { false }
        }
    }

    // ------------------------------------------------------------------ calendario del telefono
    /** Apre il calendario del telefono con un impegno gia' scritto (la persona tocca Salva). */
    @JvmStatic fun evento(titolo: String, inizio: Long, fine: Long, tuttoIlGiorno: Boolean, descrizione: String, luogo: String): Boolean {
        val i = Intent(Intent.ACTION_INSERT).setData(android.provider.CalendarContract.Events.CONTENT_URI)
            .putExtra(android.provider.CalendarContract.Events.TITLE, titolo)
            .putExtra(android.provider.CalendarContract.EXTRA_EVENT_BEGIN_TIME, inizio)
            .putExtra(android.provider.CalendarContract.EXTRA_EVENT_END_TIME, fine)
            .putExtra(android.provider.CalendarContract.EXTRA_EVENT_ALL_DAY, tuttoIlGiorno)
            .putExtra(android.provider.CalendarContract.Events.DESCRIPTION, descrizione)
            .putExtra(android.provider.CalendarContract.Events.EVENT_LOCATION, luogo)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try { app.startActivity(i); true } catch (e: Exception) { false }
    }

    /** Avviso all'ora di un impegno (anche con l'app chiusa): la notifica la mostra Sveglia. */
    @JvmStatic fun sveglia(id: Int, quando: Long, titolo: String, testo: String) {
        val am = app.getSystemService(android.app.AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(app, id,
            Intent(app, Sveglia::class.java).putExtra("id", id).putExtra("titolo", titolo).putExtra("testo", testo),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val esatta = android.os.Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        try {
            if (esatta) am.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, quando, pi)
            else am.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, quando, pi)
        } catch (e: SecurityException) {
            am.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, quando, pi)
        }
    }

    @JvmStatic fun togliSveglia(id: Int) {
        val am = app.getSystemService(android.app.AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(app, id, Intent(app, Sveglia::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE) ?: return
        am.cancel(pi); pi.cancel()
    }

    // ------------------------------------------------------------------ pezzi d'audio
    /** Copia un pezzo dell'audio (da..a millisecondi) in un altro file .m4a, senza ricodificarlo. */
    @JvmStatic fun tagliaAudio(sorgente: String, uscita: String, da: Long, a: Long): Boolean {
        val tmp = File("$uscita.tmp")
        val ex = android.media.MediaExtractor()
        try {
            ex.setDataSource(sorgente)
            var traccia = -1
            for (t in 0 until ex.trackCount) if (ex.getTrackFormat(t).getString(android.media.MediaFormat.KEY_MIME)?.startsWith("audio/") == true) { traccia = t; break }
            if (traccia < 0) return false
            ex.selectTrack(traccia)
            val mux = android.media.MediaMuxer(tmp.path, android.media.MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            val dest = mux.addTrack(ex.getTrackFormat(traccia))
            mux.start()
            ex.seekTo(da * 1000, android.media.MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
            val buf = java.nio.ByteBuffer.allocate(1 shl 18)
            val info = android.media.MediaCodec.BufferInfo()
            var t0 = -1L
            var scritti = 0
            while (true) {
                val n = ex.readSampleData(buf, 0)
                if (n < 0) break
                val t = ex.sampleTime
                if (t > a * 1000) break
                if (t >= da * 1000 - 100_000) {
                    if (t0 < 0) t0 = t
                    info.set(0, n, t - t0, android.media.MediaCodec.BUFFER_FLAG_KEY_FRAME)
                    mux.writeSampleData(dest, buf, info)
                    scritti++
                }
                ex.advance()
            }
            mux.stop(); mux.release()
            return scritti > 0 && tmp.renameTo(File(uscita))
        } catch (e: Exception) {
            android.util.Log.e("RegistraLezione", "taglia audio", e)
            tmp.delete()
            return false
        } finally { ex.release() }
    }

    /** Il pezzo d'audio da..da+durata (millisecondi) come WAV 16 kHz mono: per riconoscere le voci.
     *  Scrive mentre decodifica (un'ora d'audio non sta in memoria). */
    @JvmStatic fun decodificaWav(sorgente: String, uscita: String, da: Long, durata: Long): Boolean {
        val ex = android.media.MediaExtractor()
        var cod: android.media.MediaCodec? = null
        val f = java.io.RandomAccessFile(uscita, "rw")
        var campioni = 0L
        try {
            f.setLength(0); f.write(ByteArray(44))
            ex.setDataSource(sorgente)
            var traccia = -1
            for (t in 0 until ex.trackCount) if (ex.getTrackFormat(t).getString(android.media.MediaFormat.KEY_MIME)?.startsWith("audio/") == true) { traccia = t; break }
            if (traccia < 0) return false
            ex.selectTrack(traccia)
            val fmt = ex.getTrackFormat(traccia)
            var rate = fmt.getInteger(android.media.MediaFormat.KEY_SAMPLE_RATE)
            var canali = fmt.getInteger(android.media.MediaFormat.KEY_CHANNEL_COUNT)
            val c = android.media.MediaCodec.createDecoderByType(fmt.getString(android.media.MediaFormat.KEY_MIME)!!)
            cod = c
            c.configure(fmt, null, null, 0)
            c.start()
            ex.seekTo(da * 1000, android.media.MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
            val info = android.media.MediaCodec.BufferInfo()
            val fineUs = (da + durata) * 1000
            var fineIngresso = false
            var fine = false
            var pos = 0.0          // per passare a 16 kHz: dove sono nel suono originale
            while (!fine) {
                if (!fineIngresso) {
                    val i = c.dequeueInputBuffer(10000)
                    if (i >= 0) {
                        val b = c.getInputBuffer(i)!!
                        val n = ex.readSampleData(b, 0)
                        if (n < 0 || ex.sampleTime > fineUs) {
                            c.queueInputBuffer(i, 0, 0, 0, android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM); fineIngresso = true
                        } else { c.queueInputBuffer(i, 0, n, ex.sampleTime, 0); ex.advance() }
                    }
                }
                val o = c.dequeueOutputBuffer(info, 10000)
                if (o == android.media.MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    rate = c.outputFormat.getInteger(android.media.MediaFormat.KEY_SAMPLE_RATE)
                    canali = c.outputFormat.getInteger(android.media.MediaFormat.KEY_CHANNEL_COUNT)
                } else if (o >= 0) {
                    if (info.size > 0 && info.presentationTimeUs >= da * 1000 - 50_000 && info.presentationTimeUs <= fineUs) {
                        val sb = c.getOutputBuffer(o)!!.apply { position(info.offset); limit(info.offset + info.size) }
                            .slice().order(java.nio.ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                        val n = sb.remaining() / maxOf(1, canali)
                        val passo = rate / 16000.0
                        val dest = java.nio.ByteBuffer.allocate((n / passo + 2).toInt() * 2).order(java.nio.ByteOrder.LITTLE_ENDIAN)
                        while (pos < n) {
                            val k = pos.toInt()
                            var v = 0
                            for (ch in 0 until canali) v += sb.get(k * canali + ch)
                            dest.putShort((v / canali).toShort())
                            pos += passo
                        }
                        pos -= n
                        f.write(dest.array(), 0, dest.position())
                        campioni += dest.position() / 2
                    }
                    c.releaseOutputBuffer(o, false)
                    if (info.flags and android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) fine = true
                }
            }
            val h = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN)
            h.put("RIFF".toByteArray()).putInt((36 + campioni * 2).toInt()).put("WAVE".toByteArray()).put("fmt ".toByteArray())
                .putInt(16).putShort(1).putShort(1).putInt(16000).putInt(32000).putShort(2).putShort(16)
                .put("data".toByteArray()).putInt((campioni * 2).toInt())
            f.seek(0); f.write(h.array())
            return campioni > 0
        } catch (e: Exception) {
            android.util.Log.e("RegistraLezione", "decodifica audio", e)
            return false
        } finally {
            try { cod?.stop(); cod?.release() } catch (e: Exception) {}
            ex.release()
            f.close()
        }
    }

    // ------------------------------------------------------------------ chi parla: impronta della voce
    private var sessioneVoci: ai.onnxruntime.OrtSession? = null
    private var modelloVoci = ""

    /** L'impronta (256 numeri) di una frase: dati = bande mel (frame x 80), calcolate in Python. */
    @JvmStatic @Synchronized fun impronta(modello: String, dati: FloatArray, frame: Int): FloatArray {
        val env = ai.onnxruntime.OrtEnvironment.getEnvironment()
        if (sessioneVoci == null || modelloVoci != modello) {
            sessioneVoci?.close()
            val o = ai.onnxruntime.OrtSession.SessionOptions()
            o.setIntraOpNumThreads(2)
            sessioneVoci = env.createSession(modello, o)
            modelloVoci = modello
        }
        val s = sessioneVoci!!
        val x = ai.onnxruntime.OnnxTensor.createTensor(env, java.nio.FloatBuffer.wrap(dati), longArrayOf(1, frame.toLong(), (dati.size / maxOf(1, frame)).toLong()))
        x.use {
            s.run(mapOf(s.inputNames.first() to x)).use { r ->
                @Suppress("UNCHECKED_CAST")
                return (r.get(0).value as Array<FloatArray>)[0]
            }
        }
    }

    // ------------------------------------------------------------------ notifiche
    @JvmStatic fun notifica(titolo: String, testo: String) {
        val nm = app.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("avvisi", "Avvisi", NotificationManager.IMPORTANCE_DEFAULT))
        val apri = PendingIntent.getActivity(app, 0, Intent(app, Principale::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = android.app.Notification.Builder(app, "avvisi").setContentTitle(titolo).setContentText(testo)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentIntent(apri).setAutoCancel(true).build()
        nm.notify(2, n)
    }
}
