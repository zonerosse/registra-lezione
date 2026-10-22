plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

// numero di versione: android/versione.json (lo legge anche "Aggiorna" nell'app)
val versioneApp = groovy.json.JsonSlurper().parse(file("../versione.json")) as Map<*, *>

android {
    namespace = "it.puntowebferrara.registralezione"
    compileSdk = 34
    ndkVersion = "27.2.12479018"

    defaultConfig {
        applicationId = "it.puntowebferrara.registralezione"
        minSdk = 29
        targetSdk = 34
        versionCode = (versioneApp["codice"] as Number).toInt()
        versionName = versioneApp["versione"] as String
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
        externalNativeBuild { cmake { arguments += listOf("-DCMAKE_BUILD_TYPE=Release") } }
    }
    buildFeatures { buildConfig = true }
    // due edizioni dallo stesso codice: Verba Manent IA e Scripta Manent (per chi ha un DSA), installabili insieme
    flavorDimensions += "edizione"
    productFlavors {
        create("verba") {
            dimension = "edizione"
            resValue("string", "nome_app", "Verba Manent IA")
            buildConfigField("String", "EDIZIONE", "\"verba\"")
        }
        create("scripta") {
            dimension = "edizione"
            applicationId = "it.puntowebferrara.scriptamanent"
            resValue("string", "nome_app", "Scripta Manent")
            buildConfigField("String", "EDIZIONE", "\"scripta\"")
        }
    }
    // chiave per le versioni di prova (sempre la stessa, cosi' si aggiornano sopra le precedenti)
    signingConfigs {
        create("prova") {
            storeFile = file("../prova.keystore")
            storePassword = "registralezione"
            keyAlias = "prova"
            keyPassword = "registralezione"
        }
    }
    buildTypes {
        getByName("debug") { isJniDebuggable = false; signingConfig = signingConfigs.getByName("prova") }
    }
    externalNativeBuild {
        cmake { path = file("src/main/cpp/CMakeLists.txt"); version = "3.22.1" }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging { jniLibs { pickFirsts += listOf("**/libc++_shared.so") } }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    // «Chi parla»: il modello delle voci (lo stesso del PC) gira sul telefono
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.19.2")
    // «Sincronizza»: legge il QR del PC con il lettore di Google (dentro Google Play services, senza permessi)
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}

// la parte di appunti, PDF, flashcard ecc. e' quella del programma per Windows (in Python)
chaquopy {
    defaultConfig {
        version = "3.12"
        pip {
            install("numpy")
            install("pillow")
            install("fpdf2==2.8.9")
        }
    }
}
