package it.puntowebferrara.registralezione

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * All'ora di un impegno del calendario (anche con l'app chiusa) mostra la notifica «Sta iniziando…».
 * Toccandola si apre l'app, gia' pronta con il nome e i partecipanti dell'impegno.
 */
class Sveglia : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val id = intent.getIntExtra("id", 3)
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("calendario", "Calendario", NotificationManager.IMPORTANCE_HIGH))
        val apri = PendingIntent.getActivity(ctx, id,
            Intent(ctx, Principale::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("calendario", true),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val testo = intent.getStringExtra("testo") ?: ""
        val n = android.app.Notification.Builder(ctx, "calendario")
            .setContentTitle(intent.getStringExtra("titolo") ?: "Verba Manent IA")
            .setContentText(testo).setStyle(android.app.Notification.BigTextStyle().bigText(testo))
            .setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentIntent(apri).setAutoCancel(true)
            .setCategory(android.app.Notification.CATEGORY_EVENT).build()
        nm.notify(1000 + (id and 0xFFFF), n)
    }
}
