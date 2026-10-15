package it.puntowebferrara.registralezione

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.IBinder
import android.os.PowerManager
import java.io.File
import java.io.RandomAccessFile
import kotlin.math.sqrt

/**
 * La registrazione dal microfono, come "servizio" con la notifica fissa (come la musica):
 * continua anche a schermo spento o mentre si usano altre app.
 * Scrive audio_001.wav, audio_002.wav... (16 kHz mono, una parte ogni N secondi) nella cartella della lezione.
 * La parte in Python legge lo stato da qui (secondi, livello, parti chiuse) e chiama pausa/ferma.
 */
class Registrazione : Service() {
    companion object {
        const val RATE = 16000
        @Volatile @JvmStatic var attiva = false
        @Volatile @JvmStatic var inPausa = false
        @Volatile @JvmStatic var livello = 0f
        @Volatile @JvmStatic var campioni = 0L          // registrati (le pause non contano)
        @Volatile @JvmStatic var partiChiuse = 0         // ultima parte completa (si puo' gia' trascrivere)
        @Volatile @JvmStatic var parteCorrente = 0
        @Volatile @JvmStatic var errore = ""
        @Volatile @JvmStatic var richiestaFine = false   // "Fine" toccato nella notifica
        private var cartella = ""
        private var parteSecondi = 1800
        private var titolo = ""
        private var filo: Thread? = null
        private var sveglia: PowerManager.WakeLock? = null      // per i lavori lunghi (trascrizione, appunti)
        private var svegliaReg: PowerManager.WakeLock? = null   // solo mentre registra

        @JvmStatic fun secondi(): Double = campioni / RATE.toDouble()

        @JvmStatic fun avvia(ctx: Context, dir: String, parteSec: Int, nome: String): Boolean {
            if (attiva) return false
            cartella = dir; parteSecondi = parteSec; titolo = nome
            campioni = 0; partiChiuse = 0; parteCorrente = 0; errore = ""; richiestaFine = false; inPausa = false
            attiva = true
            ctx.startForegroundService(Intent(ctx, Registrazione::class.java))
            return true
        }

        @JvmStatic fun pausa(si: Boolean) { inPausa = si; if (si) livello = 0f }

        /** Ferma e aspetta che l'ultimo file sia chiuso. Ritorna i secondi registrati. */
        @JvmStatic fun ferma(ctx: Context): Double {
            attiva = false
            filo?.join(10000)
            ctx.stopService(Intent(ctx, Registrazione::class.java))
            return secondi()
        }

        /** Volume del microfono adesso (0..1), ascoltando un decimo di secondo. -1 se non si puo'. */
        @JvmStatic fun livelloAdesso(): Float {
            if (attiva) return livello
            return try {
                val min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
                val rec = AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, RATE, AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, maxOf(min, RATE))
                if (rec.state != AudioRecord.STATE_INITIALIZED) return -1f
                val buf = ShortArray(RATE / 5)
                rec.startRecording()
                var letti = 0
                while (letti < buf.size) { val n = rec.read(buf, letti, buf.size - letti); if (n <= 0) break; letti += n }
                rec.stop(); rec.release()
                var s = 0.0
                for (i in RATE / 10 until letti) s += (buf[i] / 32768.0) * (buf[i] / 32768.0)   // il primo pezzo e' spesso silenzio
                val n = maxOf(1, letti - RATE / 10)
                minOf(1.0, sqrt(s / n) * 6).toFloat()
            } catch (e: Exception) { -1f }
        }

        /** Tiene acceso il processore (non lo schermo) durante trascrizioni lunghe. */
        @JvmStatic fun tieniSveglio(ctx: Context, si: Boolean) {
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (si && sveglia == null) {
                sveglia = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RegistraLezione:lavoro").apply { acquire(6 * 3600 * 1000L) }
            } else if (!si) {
                sveglia?.let { if (it.isHeld) it.release() }
                sveglia = null
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "pausa" -> { inPausa = !inPausa; aggiornaNotifica(); return START_NOT_STICKY }
            "fine" -> { richiestaFine = true; return START_NOT_STICKY }
        }
        startForeground(1, notifica(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        if (svegliaReg == null) svegliaReg = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RegistraLezione:registro").apply { acquire(12 * 3600 * 1000L) }
        filo = Thread { registra() }.apply { start() }
        return START_NOT_STICKY
    }

    private fun azione(nome: String, codice: Int) = PendingIntent.getService(
        this, codice, Intent(this, Registrazione::class.java).setAction(nome), PendingIntent.FLAG_IMMUTABLE)

    private fun notifica(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("registrazione", "Registrazione", NotificationManager.IMPORTANCE_LOW))
        val apri = PendingIntent.getActivity(this, 0, Intent(this, Principale::class.java), PendingIntent.FLAG_IMMUTABLE)
        val min = (secondi() / 60).toInt()
        return Notification.Builder(this, "registrazione")
            .setContentTitle(if (inPausa) "⏸ In pausa · $titolo" else "● Registro · $titolo")
            .setContentText("%d:%02d registrati".format(min / 60, min % 60))
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true).setContentIntent(apri)
            .addAction(Notification.Action.Builder(null, if (inPausa) "Riprendi" else "Pausa", azione("pausa", 1)).build())
            .addAction(Notification.Action.Builder(null, "Fine", azione("fine", 2)).build())
            .build()
    }

    private fun aggiornaNotifica() {
        if (attiva) getSystemService(NotificationManager::class.java).notify(1, notifica())
    }

    private fun apriWav(k: Int): RandomAccessFile {
        val f = RandomAccessFile(File(cartella, "audio_%03d.wav".format(k)), "rw")
        f.setLength(0)
        f.write(ByteArray(44))          // l'intestazione si scrive alla chiusura, con le misure giuste
        return f
    }

    private fun chiudiWav(f: RandomAccessFile) {
        val dati = (f.length() - 44).toInt()
        val h = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN)
        h.put("RIFF".toByteArray()).putInt(36 + dati).put("WAVE".toByteArray())
        h.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(RATE).putInt(RATE * 2).putShort(2).putShort(16)
        h.put("data".toByteArray()).putInt(dati)
        f.seek(0); f.write(h.array()); f.close()
    }

    private fun registra() {
        var wav: RandomAccessFile? = null
        try {
            val min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val rec = AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, RATE, AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT, maxOf(min, RATE))
            if (rec.state != AudioRecord.STATE_INITIALIZED) { errore = "audio"; return }
            val buf = ShortArray(RATE / 10)
            val bytes = java.nio.ByteBuffer.allocate(buf.size * 2).order(java.nio.ByteOrder.LITTLE_ENDIAN)
            var k = 1
            var nellaParte = 0L
            val perParte = RATE.toLong() * parteSecondi
            wav = apriWav(k); parteCorrente = k
            var ultimaNotifica = 0L
            rec.startRecording()
            while (attiva) {
                val n = rec.read(buf, 0, buf.size)
                if (n <= 0) continue
                if (inPausa) continue                 // intervallo: si ascolta ma non si salva
                var s = 0.0
                bytes.clear()
                for (i in 0 until n) { s += (buf[i] / 32768.0) * (buf[i] / 32768.0); bytes.putShort(buf[i]) }
                livello = minOf(1.0, sqrt(s / n) * 6).toFloat()
                wav!!.write(bytes.array(), 0, n * 2)
                campioni += n; nellaParte += n
                if (nellaParte >= perParte) {
                    chiudiWav(wav); partiChiuse = k
                    k += 1; nellaParte = 0
                    wav = apriWav(k); parteCorrente = k
                }
                if (System.currentTimeMillis() - ultimaNotifica > 10000) { ultimaNotifica = System.currentTimeMillis(); aggiornaNotifica() }
            }
            rec.stop(); rec.release()
            chiudiWav(wav!!); wav = null
            if (nellaParte > 0) partiChiuse = k
            else File(cartella, "audio_%03d.wav".format(k)).delete()
        } catch (e: Exception) {
            errore = "audio"
            try { wav?.let { chiudiWav(it) } } catch (_: Exception) {}
        } finally {
            svegliaReg?.let { if (it.isHeld) it.release() }
            svegliaReg = null
        }
    }
}
