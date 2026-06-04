package com.example.smartenglish.util

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.speech.tts.TextToSpeech
import android.util.Log
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AudioPlayer(private val context: Context) : TextToSpeech.OnInitListener {
    private var mediaPlayer: MediaPlayer? = null
    private var tts: TextToSpeech? = null
    private var isTtsReady = false
    private val coroutineScope = CoroutineScope(Dispatchers.Main)

    init {
        try {
            tts = TextToSpeech(context.applicationContext, this)
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Failed to initialize TTS: ${e.message}")
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            setNativeEnglishVoice()
            isTtsReady = true
        } else {
            Log.e("AudioPlayer", "TTS Initialization failed")
        }
    }

    private fun setNativeEnglishVoice() {
        try {
            val voices = tts?.voices
            if (!voices.isNullOrEmpty()) {
                // 1. Try to find a high-quality US or UK voice that does not require an active network connection
                val preferredVoice = voices.find { voice ->
                    val locale = voice.locale
                    locale.language.equals("en", ignoreCase = true) &&
                    (locale.country.equals("US", ignoreCase = true) || locale.country.equals("GB", ignoreCase = true)) &&
                    !voice.isNetworkConnectionRequired
                } ?: voices.find { voice ->
                    // 2. Fallback to any US/UK voice
                    val locale = voice.locale
                    locale.language.equals("en", ignoreCase = true) &&
                    (locale.country.equals("US", ignoreCase = true) || locale.country.equals("GB", ignoreCase = true))
                } ?: voices.find { voice ->
                    // 3. Fallback to any English voice
                    val locale = voice.locale
                    locale.language.equals("en", ignoreCase = true)
                }

                if (preferredVoice != null) {
                    tts?.voice = preferredVoice
                    Log.d("AudioPlayer", "Selected TTS voice: ${preferredVoice.name}")
                } else {
                    tts?.setLanguage(Locale.US)
                }
            } else {
                tts?.setLanguage(Locale.US)
            }
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Error setting native English voice: ${e.message}")
            tts?.setLanguage(Locale.US)
        }
    }

    fun playPronunciation(text: String, audioPathOrUrl: String?) {
        // 1. If a local audio file or a valid remote audio URL is already provided, play it
        if (!audioPathOrUrl.isNullOrBlank() && (audioPathOrUrl.startsWith("http") || File(audioPathOrUrl).exists())) {
            playAudioUrl(audioPathOrUrl, text)
            return
        }

        // 2. Otherwise, fetch high-quality audio URL from Free Dictionary API. Fallback to TTS on error.
        coroutineScope.launch {
            val fetchedUrl = withContext(Dispatchers.IO) {
                fetchDictionaryAudioUrl(text)
            }
            if (!fetchedUrl.isNullOrBlank()) {
                playAudioUrl(fetchedUrl, text)
            } else {
                playTts(text)
            }
        }
    }

    private fun playAudioUrl(url: String, fallbackText: String) {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                setDataSource(url)
                prepareAsync()
                setOnPreparedListener { start() }
                setOnErrorListener { _, what, extra ->
                    Log.e("AudioPlayer", "MediaPlayer error: what=$what, extra=$extra. Falling back to TTS.")
                    playTts(fallbackText)
                    true
                }
            }
        } catch (e: Exception) {
            Log.e("AudioPlayer", "MediaPlayer failed to set data source: ${e.message}. Falling back to TTS.")
            playTts(fallbackText)
        }
    }

    private fun fetchDictionaryAudioUrl(word: String): String? {
        if (word.isBlank()) return null
        var connection: HttpURLConnection? = null
        return try {
            val encodedWord = java.net.URLEncoder.encode(word.trim(), "UTF-8")
            val url = URL("https://api.dictionaryapi.dev/api/v2/entries/en/$encodedWord")
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 3000
            connection.readTimeout = 3000

            if (connection.responseCode == 200) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = org.json.JSONArray(responseText)
                if (jsonArray.length() > 0) {
                    val entry = jsonArray.getJSONObject(0)
                    val phonetics = entry.optJSONArray("phonetics")
                    if (phonetics != null) {
                        for (i in 0 until phonetics.length()) {
                            val phonetic = phonetics.getJSONObject(i)
                            val audioUrl = phonetic.optString("audio")
                            if (!audioUrl.isNullOrBlank() && audioUrl.startsWith("http")) {
                                return audioUrl
                            }
                        }
                    }
                }
            }
            null
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Failed to fetch dictionary audio URL for '$word': ${e.message}")
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun playTts(text: String) {
        if (isTtsReady && tts != null) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pronunciation_tts")
        } else {
            Log.w("AudioPlayer", "TTS not ready or uninitialized. Initializing and playing.")
            tts = TextToSpeech(context.applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    setNativeEnglishVoice()
                    isTtsReady = true
                    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pronunciation_tts")
                }
            }
        }
    }

    fun release() {
        try {
            coroutineScope.cancel()
            mediaPlayer?.release()
            mediaPlayer = null
            tts?.stop()
            tts?.shutdown()
            tts = null
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Error releasing resources: ${e.message}")
        }
    }
}
