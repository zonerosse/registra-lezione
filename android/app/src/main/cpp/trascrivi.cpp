// Ponte fra l'app (Kotlin) e whisper.cpp: trascrive campioni a 16 kHz e ritorna righe "inizio|fine|testo".
#include <jni.h>
#include <string>
#include <android/log.h>
#include "whisper.h"

extern "C" JNIEXPORT jstring JNICALL
Java_it_puntowebferrara_registralezione_Whisper_trascrivi(JNIEnv *env, jobject, jstring modello,
                                                          jfloatArray campioni, jstring lingua, jint thread) {
    const char *percorso = env->GetStringUTFChars(modello, nullptr);
    const char *lng = env->GetStringUTFChars(lingua, nullptr);
    whisper_context_params cp = whisper_context_default_params();
    whisper_context *ctx = whisper_init_from_file_with_params(percorso, cp);
    env->ReleaseStringUTFChars(modello, percorso);
    if (!ctx) {
        env->ReleaseStringUTFChars(lingua, lng);
        return env->NewStringUTF("ERRORE modello");
    }
    whisper_full_params p = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    p.n_threads = thread;
    p.language = lng;
    p.translate = false;
    p.no_context = true;
    p.print_progress = false;
    p.print_realtime = false;
    p.print_special = false;
    p.print_timestamps = false;
    jsize n = env->GetArrayLength(campioni);
    jfloat *dati = env->GetFloatArrayElements(campioni, nullptr);
    int esito = whisper_full(ctx, p, dati, n);
    env->ReleaseFloatArrayElements(campioni, dati, JNI_ABORT);
    env->ReleaseStringUTFChars(lingua, lng);
    std::string out;
    if (esito != 0) {
        out = "ERRORE trascrizione";
    } else {
        int segs = whisper_full_n_segments(ctx);
        for (int i = 0; i < segs; i++) {
            out += std::to_string(whisper_full_get_segment_t0(ctx, i) / 100.0) + "|" +
                   std::to_string(whisper_full_get_segment_t1(ctx, i) / 100.0) + "|" +
                   whisper_full_get_segment_text(ctx, i) + "\n";
        }
    }
    whisper_free(ctx);
    return env->NewStringUTF(out.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_it_puntowebferrara_registralezione_Whisper_info(JNIEnv *env, jobject) {
    return env->NewStringUTF(whisper_print_system_info());
}
