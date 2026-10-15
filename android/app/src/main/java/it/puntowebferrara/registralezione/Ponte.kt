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

    /** tipo: "video" (video o audio) o "pdf". Ritorna il percorso di una copia nella cache dell'app, o "". */
    @JvmStatic fun scegliFile(tipo: String): String {
        val a = attivita.get() ?: return ""
        val l = CountDownLatch(1)
        scelta = l
        scelto = ""
        a.runOnUiThread {
            val i = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            if (tipo == "pdf") i.type = "application/pdf"
            else { i.type = "*/*"; i.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("video/*", "audio/*")) }
            a.startActivityForResult(i, SCEGLI)
        }
        l.await(30, TimeUnit.MINUTES)
        return scelto
    }

    fun risultatoScelta(dati: Intent?) {
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
