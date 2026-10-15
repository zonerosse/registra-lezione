plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "it.puntowebferrara.registralezione"
    compileSdk = 34
    ndkVersion = "27.2.12479018"

    defaultConfig {
        applicationId = "it.puntowebferrara.registralezione"
        minSdk = 29
        targetSdk = 34
        versionCode = 2
        versionName = "0.2-prova"
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
        externalNativeBuild { cmake { arguments += listOf("-DCMAKE_BUILD_TYPE=Release") } }
    }
    buildTypes {
        getByName("debug") { isJniDebuggable = false }
    }
    externalNativeBuild {
        cmake { path = file("src/main/cpp/CMakeLists.txt"); version = "3.22.1" }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
