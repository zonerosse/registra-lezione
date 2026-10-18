package it.puntowebferrara.registralezione

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.io.File
import java.lang.ref.WeakReference
import java.util.Locale
import kotlin.concurrent.thread

/**
 * Verba Manent IA (prima «Registra Lezione») per Android.
 * Le pagine sono le stesse del programma per Windows (cartella "interfaccia"), mostrate in una WebView;
 * il "motore" (trascrizione, appunti, PDF, ripasso...) e' lo stesso codice Python, che gira dentro l'app.
 * Python apre un piccolo server solo sul telefono (127.0.0.1): la pagina gli parla come nelle prove sul PC.
 */
class Principale : Activity() {
    private var web: WebView? = null
    private val blu = Color.rgb(6, 30, 54)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Ponte.app = applicationContext
        Ponte.attivita = WeakReference(this)
        window.statusBarColor = blu
        window.navigationBarColor = Color.WHITE
        val attesa = TextView(this).apply {
            text = "Verba Manent IA\n\n" + (if (Locale.getDefault().language == "it") "Avvio…" else "Starting…")
            setTextColor(Color.WHITE); textSize = 20f; gravity = Gravity.CENTER; setBackgroundColor(blu)
        }
        setContentView(attesa)
        chiediPermessi()
        WebView.setWebContentsDebuggingEnabled(true)     // versioni di prova: serve alle prove automatiche
        thread {
            val porta = try {
                copiaProgramma()
                if (!Python.isStarted()) Python.start(AndroidPlatform(this))
                Python.getInstance().getModule("avvio_android")
                    .callAttr("avvia", File(filesDir, "rl").absolutePath, Locale.getDefault().language).toInt()
            } catch (e: Throwable) {
                android.util.Log.e("RegistraLezione", "avvio", e)
                runOnUiThread { attesa.text = "Verba Manent IA\n\n⚠ " + e.toString().take(600) }
                return@thread
            }
            runOnUiThread { mostra(porta) }
        }
    }

    /** Le pagine e il motore stanno negli "assets" dell'app: li copio in una cartella vera (solo se e' una versione nuova). */
    private fun copiaProgramma() {
        val dest = File(filesDir, "rl")
        val segno = File(dest, ".versione")
        val v = packageManager.getPackageInfo(packageName, 0).let { "${it.longVersionCode}-${it.lastUpdateTime}" }
        if (segno.exists() && segno.readText() == v) return
        dest.deleteRecursively()
        fun copia(asset: String, f: File) {
            val figli = assets.list(asset) ?: emptyArray()
            if (figli.isEmpty()) {
                f.parentFile?.mkdirs()
                assets.open(asset).use { i -> f.outputStream().use { i.copyTo(it) } }
            } else for (n in figli) copia("$asset/$n", File(f, n))
        }
        copia("rl", dest)
        segno.writeText(v)
    }

    private fun mostra(porta: Int) {
        val w = WebView(this)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.settings.textZoom = 100
        w.setBackgroundColor(blu)
        w.webChromeClient = WebChromeClient()
        w.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, r: WebResourceRequest): Boolean {
                // i link verso internet si aprono nel browser del telefono
                if (r.url.host != "127.0.0.1") { Ponte.apriLink(r.url.toString()); return true }
                return false
            }
        }
        w.loadUrl("http://127.0.0.1:$porta/index.html?android=1")
        web = w
        setContentView(w)
    }

    private fun chiediPermessi() {
        val servono = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (android.os.Build.VERSION.SDK_INT >= 33) servono += Manifest.permission.POST_NOTIFICATIONS
        val mancano = servono.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (mancano.isNotEmpty()) requestPermissions(mancano.toTypedArray(), 1)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == Ponte.SCEGLI) Ponte.risultatoScelta(if (resultCode == RESULT_OK) data else null)
        if (requestCode == Ponte.SCATTA) Ponte.risultatoScatto(resultCode == RESULT_OK)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // "Indietro": la pagina chiude un dialogo o torna alla schermata precedente; se non c'e' niente, l'app va dietro
        val w = web ?: return super.onBackPressed()
        w.evaluateJavascript("window.indietro ? indietro() : false") { r -> if (r != "true") moveTaskToBack(true) }
    }

    override fun onResume() {
        super.onResume()
        Ponte.attivita = WeakReference(this)
    }
}
