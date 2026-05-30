package com.example.smartenglish.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.URL

/**
 * DictionaryHelper — Gọi Free Dictionary API + Datamuse API để gợi ý từ vựng.
 * Không cần API key, hoàn toàn miễn phí.
 */
object DictionaryHelper {

    private const val DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"
    private const val DATAMUSE_URL = "https://api.datamuse.com/words"

    data class DictResult(
        val phonetic: String? = null,
        val audio: String? = null,
        val definition: String? = null,
        val example: String? = null,
        val relatedWords: String? = null,
        val collocation: String? = null
    )

    /**
     * Tra từ và lấy toàn bộ thông tin: IPA, definition, example, related words, collocations.
     */
    suspend fun lookupAll(word: String): DictResult = withContext(Dispatchers.IO) {
        val trimmed = word.trim().lowercase()
        if (trimmed.isBlank()) return@withContext DictResult()

        // Chạy song song 4 requests
        val dictDeferred = async {
            runCatching { fetchDictionary(trimmed) }.getOrNull()
        }
        val relatedDeferred = async {
            runCatching { fetchDatamuse("rel_syn=$trimmed&ml=$trimmed", 8) }.getOrElse { "" }
        }
        val collocDeferred = async {
            runCatching { fetchDatamuseCombined(trimmed, 6) }.getOrElse { "" }
        }

        val dict = dictDeferred.await()
        val related = relatedDeferred.await()
        val colloc = collocDeferred.await()

        DictResult(
            phonetic = dict?.first,
            audio = dict?.second,
            definition = dict?.third,
            example = dict?.fourth,
            relatedWords = related.takeIf { it.isNotBlank() },
            collocation = colloc.takeIf { it.isNotBlank() }
        )
    }

    /** Tuple helper */
    private data class QuadTuple(
        val first: String?,
        val second: String?,
        val third: String?,
        val fourth: String?
    )

    private fun fetchDictionary(word: String): QuadTuple? {
        val text = URL("$DICT_URL/${word}").readText()
        val arr = JSONArray(text)
        if (arr.length() == 0) return null
        val entry = arr.getJSONObject(0)

        // Phonetic
        var phonetic: String? = null
        var audio: String? = null
        val phonetics = entry.optJSONArray("phonetics")
        if (phonetics != null) {
            for (i in 0 until phonetics.length()) {
                val p = phonetics.getJSONObject(i)
                if (phonetic == null && p.optString("text").isNotBlank())
                    phonetic = p.optString("text")
                if (audio == null) {
                    val a = p.optString("audio")
                    if (a.isNotBlank()) audio = if (a.startsWith("//")) "https:$a" else a
                }
            }
        }
        if (phonetic == null) phonetic = entry.optString("phonetic").takeIf { it.isNotBlank() }

        // Definition + Example
        var definition: String? = null
        var example: String? = null
        val meanings = entry.optJSONArray("meanings")
        if (meanings != null && meanings.length() > 0) {
            val meaning = meanings.getJSONObject(0)
            val defs = meaning.optJSONArray("definitions")
            if (defs != null && defs.length() > 0) {
                val d = defs.getJSONObject(0)
                definition = d.optString("definition").takeIf { it.isNotBlank() }
                example = d.optString("example").takeIf { it.isNotBlank() }
            }
        }

        return QuadTuple(phonetic, audio, definition, example)
    }

    /** Datamuse single query — trả về danh sách từ cách nhau bởi ", " */
    private fun fetchDatamuse(query: String, max: Int): String {
        val text = URL("$DATAMUSE_URL?$query&max=$max").readText()
        val arr = JSONArray(text)
        val words = mutableListOf<String>()
        val seen = mutableSetOf<String>()
        for (i in 0 until arr.length()) {
            val w = arr.getJSONObject(i).optString("word")
            if (w.isNotBlank() && seen.add(w)) words.add(w)
        }
        return words.joinToString(", ")
    }

    /** Lấy collocations từ nhiều relation types: trg + rel_jja + rel_jjb */
    private fun fetchDatamuseCombined(word: String, max: Int): String {
        val enc = word.replace(" ", "+")
        val queries = listOf("trg=$enc", "rel_jja=$enc", "rel_jjb=$enc")
        val seen = mutableSetOf<String>()
        val words = mutableListOf<String>()
        for (q in queries) {
            if (words.size >= max) break
            runCatching {
                val text = URL("$DATAMUSE_URL?$q&max=$max").readText()
                val arr = JSONArray(text)
                for (i in 0 until arr.length()) {
                    val w = arr.getJSONObject(i).optString("word")
                    if (w.isNotBlank() && seen.add(w)) words.add(w)
                    if (words.size >= max) break
                }
            }
        }
        return words.joinToString(", ")
    }
}
