package it.puntowebferrara.registralezione

/** Il riconoscitore vocale (whisper.cpp) che gira sul telefono, senza internet. */
object Whisper {
    init { System.loadLibrary("rlwhisper") }
    external fun trascrivi(modello: String, campioni: FloatArray, lingua: String, thread: Int): String
    external fun info(): String
}
