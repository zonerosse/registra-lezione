package it.puntowebferrara.registralezione

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/** Gira in un processo a parte: chiude l'app e la riapre (serve dopo l'aggiornamento leggero). */
class Riavvio : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pid = intent.getIntExtra("pid", -1)
        if (pid > 0) android.os.Process.killProcess(pid)
        Thread.sleep(400)
        startActivity(Intent(this, Principale::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        finish()
        Runtime.getRuntime().exit(0)
    }
}
