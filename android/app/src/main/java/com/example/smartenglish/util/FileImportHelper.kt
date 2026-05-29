package com.example.smartenglish.util

object FileImportHelper {

    fun parseCsv(content: String): CsvParseResult {
        val lines = content
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .split("\n")
            .map { it.trimEnd() }
            .filter { it.isNotBlank() }

        if (lines.isEmpty()) return CsvParseResult(emptyList(), emptyList())

        val headers = parseLine(lines.first())
        val rows = lines.drop(1).map { parseLine(it) }
        return CsvParseResult(headers, rows)
    }

    private fun parseLine(line: String): List<String> {
        val result = mutableListOf<String>()
        val current = StringBuilder()
        var inQuotes = false

        var i = 0
        while (i < line.length) {
            val c = line[i]
            val next = line.getOrNull(i + 1)

            when {
                c == '"' && inQuotes && next == '"' -> {
                    current.append('"')
                    i += 2
                    continue
                }

                c == '"' -> {
                    inQuotes = !inQuotes
                }

                c == ',' && !inQuotes -> {
                    result.add(current.toString().trim())
                    current.setLength(0)
                }

                else -> current.append(c)
            }

            i++
        }

        result.add(current.toString().trim())
        return result
    }

    data class CsvParseResult(
        val headers: List<String>,
        val rows: List<List<String>>
    )
}
