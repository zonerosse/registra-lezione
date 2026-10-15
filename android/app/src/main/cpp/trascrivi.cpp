// Ponte fra l'app e whisper.cpp (il riconoscitore vocale che gira sul telefono, senza internet).
#include <jni.h>
#include <atomic>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>
#include "whisper.h"

static std::mutex g_lock;
static whisper_context *g_ctx = nullptr;
static std::string g_modello;
static std::atomic<int> g_progresso{0};

// WAV 16 bit mono -> numeri decimali (il registratore dell'app scrive gia' a 16 kHz)
static bool leggi_wav(const char *percorso, std::vector<float> &out) {
    FILE *f = fopen(percorso, "rb");
    if (!f) return false;
    char id[4];
    uint32_t len;
    fseek(f, 12, SEEK_SET);
    while (fread(id, 1, 4, f) == 4 && fread(&len, 4, 1, f) == 1) {
        if (memcmp(id, "data", 4) == 0) {
            std::vector<int16_t> s(len / 2);
            size_t n = fread(s.data(), 2, s.size(), f);
            out.resize(n);
            for (size_t i = 0; i < n; i++) out[i] = s[i] / 32768.0f;
            fclose(f);
            return true;
        }
        fseek(f, len, SEEK_CUR);
    }
    fclose(f);
    return false;
}

static whisper_context *contesto(const char *modello) {
    if (g_ctx && g_modello == modello) return g_ctx;
    if (g_ctx) whisper_free(g_ctx);
    whisper_context_params cp = whisper_context_default_params();
    g_ctx = whisper_init_from_file_with_params(modello, cp);
    g_modello = g_ctx ? modello : "";
    return g_ctx;
}

static std::string trascrivi(whisper_context *ctx, const std::vector<float> &a, const char *lingua, const char *prompt,
                             int thread, int beam) {
    whisper_full_params p = whisper_full_default_params(beam > 1 ? WHISPER_SAMPLING_BEAM_SEARCH : WHISPER_SAMPLING_GREEDY);
    if (beam > 1) p.beam_search.beam_size = beam;
    p.n_threads = thread;
    p.language = lingua;
    p.translate = false;
    p.no_context = true;
    p.print_progress = false;
    p.print_realtime = false;
    p.print_special = false;
    p.print_timestamps = false;
    if (prompt && prompt[0]) p.initial_prompt = prompt;
    g_progresso = 0;
    p.progress_callback = [](whisper_context *, whisper_state *, int pr, void *) { g_progresso = pr; };
    if (whisper_full(ctx, p, a.data(), (int)a.size()) != 0) return "ERRORE trascrizione";
    std::string out = std::string("LANG|") + whisper_lang_str(whisper_full_lang_id(ctx)) + "\n";
    int n = whisper_full_n_segments(ctx);
    for (int i = 0; i < n; i++) {
        out += std::to_string(whisper_full_get_segment_t0(ctx, i) / 100.0) + "|" +
               std::to_string(whisper_full_get_segment_t1(ctx, i) / 100.0) + "|" + whisper_full_get_segment_text(ctx, i) + "\n";
    }
    g_progresso = 100;
    return out;
}

static jstring utf8(JNIEnv *env, const std::string &s) {
    // stringa UTF-8 vera (NewStringUTF vuole l'UTF-8 "modificato": con le emoji sbaglierebbe)
    jbyteArray b = env->NewByteArray((jsize)s.size());
    env->SetByteArrayRegion(b, 0, (jsize)s.size(), (const jbyte *)s.data());
    jclass str = env->FindClass("java/lang/String");
    jmethodID ctor = env->GetMethodID(str, "<init>", "([BLjava/lang/String;)V");
    return (jstring)env->NewObject(str, ctor, b, env->NewStringUTF("UTF-8"));
}

// trascrive un file WAV; prima = file della parte precedente: i suoi ultimi secPrima secondi vanno davanti
extern "C" JNIEXPORT jstring JNICALL
Java_it_puntowebferrara_registralezione_Whisper_trascriviFile(JNIEnv *env, jobject, jstring modello, jstring wav,
                                                              jstring prima, jfloat secPrima, jstring lingua,
                                                              jstring prompt, jint thread, jint beam) {
    std::lock_guard<std::mutex> l(g_lock);
    const char *m = env->GetStringUTFChars(modello, nullptr);
    const char *w = env->GetStringUTFChars(wav, nullptr);
    const char *pr = env->GetStringUTFChars(prima, nullptr);
    const char *lg = env->GetStringUTFChars(lingua, nullptr);
    const char *pt = env->GetStringUTFChars(prompt, nullptr);
    std::string out;
    std::vector<float> a, c;
    whisper_context *ctx = contesto(m);
    if (!ctx) out = "ERRORE modello";
    else if (!leggi_wav(w, a)) out = "ERRORE audio";
    else {
        float davanti = 0;
        if (pr[0] && secPrima > 0 && leggi_wav(pr, c)) {
            size_t k = (size_t)(secPrima * 16000);
            if (c.size() > k) c.erase(c.begin(), c.end() - k);
            davanti = c.size() / 16000.0f;
            a.insert(a.begin(), c.begin(), c.end());
        }
        out = std::string("PRIMA|") + std::to_string(davanti) + "\n" + trascrivi(ctx, a, lg, pt, thread, beam);
    }
    env->ReleaseStringUTFChars(modello, m);
    env->ReleaseStringUTFChars(wav, w);
    env->ReleaseStringUTFChars(prima, pr);
    env->ReleaseStringUTFChars(lingua, lg);
    env->ReleaseStringUTFChars(prompt, pt);
    return utf8(env, out);
}

// campioni gia' in memoria (testo in diretta, prove)
extern "C" JNIEXPORT jstring JNICALL
Java_it_puntowebferrara_registralezione_Whisper_trascrivi(JNIEnv *env, jobject, jstring modello, jfloatArray campioni,
                                                          jstring lingua, jint thread) {
    std::lock_guard<std::mutex> l(g_lock);
    const char *m = env->GetStringUTFChars(modello, nullptr);
    const char *lg = env->GetStringUTFChars(lingua, nullptr);
    jsize n = env->GetArrayLength(campioni);
    std::vector<float> a(n);
    env->GetFloatArrayRegion(campioni, 0, n, a.data());
    whisper_context *ctx = contesto(m);
    std::string out = ctx ? trascrivi(ctx, a, lg, "", thread, 1) : "ERRORE modello";
    env->ReleaseStringUTFChars(modello, m);
    env->ReleaseStringUTFChars(lingua, lg);
    return utf8(env, out);
}

extern "C" JNIEXPORT jint JNICALL
Java_it_puntowebferrara_registralezione_Whisper_progresso(JNIEnv *, jobject) { return g_progresso.load(); }

extern "C" JNIEXPORT jstring JNICALL
Java_it_puntowebferrara_registralezione_Whisper_info(JNIEnv *env, jobject) {
    return env->NewStringUTF(whisper_print_system_info());
}
