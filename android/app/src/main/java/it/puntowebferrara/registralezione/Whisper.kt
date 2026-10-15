package it.puntowebferrara.registralezione

/** Il riconoscitore vocale (whisper.cpp) che gira sul telefono, senza internet. */
object Whisper {
    init { System.loadLibrary("rlwhisper") }
    external fun trascriviFile(modello: String, wav: String, prima: String, secPrima: Float, lingua: String,
                               prompt: String, thread: Int, beam: Int): String
    external fun trascrivi(modello: String, campioni: FloatArray, lingua: String, thread: Int): String
    external fun progresso(): Int
    external fun info(): String
}
