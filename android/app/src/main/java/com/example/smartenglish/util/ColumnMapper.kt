package com.example.smartenglish.util

object ColumnMapper {

    data class Mapping(
        val front: Int,
        val back: Int,
        val pronunciation: Int = -1,
        val example: Int = -1,
        val note: Int = -1,
        val collocation: Int = -1,
        val relatedWords: Int = -1
    )

    fun autoDetect(headers: List<String>): Mapping {
        val normalized = headers.map { normalize(it) }

        var frontIdx = normalized.indexOfFirst { it in listOf("front", "term", "word", "vocab", "question") }
        var backIdx = normalized.indexOfFirst { it in listOf("back", "definition", "meaning", "answer", "translation", "vietnamese") }
        val pronunciationIdx = normalized.indexOfFirst { it in listOf("pronunciation", "pronounce", "ipa") }
        val exampleIdx = normalized.indexOfFirst { it in listOf("example", "sentence", "usage") }
        val noteIdx = normalized.indexOfFirst { it in listOf("note", "notes", "hint") }
        val collocationIdx = normalized.indexOfFirst { it in listOf("collocation", "collocations") }
        val relatedWordsIdx = normalized.indexOfFirst { it in listOf("relatedwords", "relatedword", "related", "related_words") }

        // Fallbacks if auto-detection fails
        if (frontIdx == -1 && headers.isNotEmpty()) {
            frontIdx = 0
        }
        if (backIdx == -1 && headers.size > 1) {
            backIdx = if (frontIdx == 1) 0 else 1
        }

        return Mapping(
            front = frontIdx,
            back = backIdx,
            pronunciation = pronunciationIdx,
            example = exampleIdx,
            note = noteIdx,
            collocation = collocationIdx,
            relatedWords = relatedWordsIdx
        )
    }

    private fun normalize(s: String): String = s
        .replace("\uFEFF", "") // Strip UTF-8 BOM
        .trim()
        .lowercase()
        .replace("_", " ")
        .replace(Regex("\\s+"), " ")
}
