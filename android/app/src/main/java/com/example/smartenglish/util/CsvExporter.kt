package com.example.smartenglish.util

import com.example.smartenglish.domain.model.Flashcard

object CsvExporter {

    private val CSV_HEADERS = listOf(
        "front",
        "back",
        "pronunciation",
        "example",
        "note",
        "collocation",
        "relatedWords"
    )

    fun generateCsv(cards: List<Flashcard>): String {
        val sb = StringBuilder()

        // BOM giúp Excel hiểu UTF-8 đúng với tiếng Việt
        sb.append('\uFEFF')

        sb.appendLine(CSV_HEADERS.joinToString(",") { escapeCsvField(it) })

        cards.forEach { card ->
            val row = listOf(
                card.front,
                card.back,
                card.pronunciation.orEmpty(),
                card.example.orEmpty(),
                card.note.orEmpty(),
                // Week 3: tạm bỏ qua 2 field này
                "",
                ""
            )
            sb.appendLine(row.joinToString(",") { escapeCsvField(it) })
        }

        return sb.toString()
    }

    private fun escapeCsvField(field: String): String {
        val normalized = field
            .replace("\r\n", "\n")
            .replace("\r", "\n")

        return if (normalized.contains(",") || normalized.contains('"') || normalized.contains("\n")) {
            "\"${normalized.replace("\"", "\"\"")}\""
        } else normalized
    }
}
