package com.example.smartenglish.util

import org.apache.poi.ss.usermodel.Cell
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.ss.usermodel.DateUtil
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.InputStream

object XlsxImporter {

    fun parseXlsx(inputStream: InputStream): FileImportHelper.CsvParseResult {
        val workbook = XSSFWorkbook(inputStream)
        val sheet = workbook.getSheetAt(0)
        val rows = mutableListOf<List<String>>()

        for (row in sheet) {
            val cells = mutableListOf<String>()
            val last = row.lastCellNum.toInt().coerceAtLeast(0)

            for (i in 0 until last) {
                val cell = row.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL)
                cells.add(cell?.let { getCellValue(it) }.orEmpty())
            }

            if (cells.any { it.isNotBlank() }) rows.add(cells)
        }

        workbook.close()

        if (rows.isEmpty()) return FileImportHelper.CsvParseResult(emptyList(), emptyList())
        return FileImportHelper.CsvParseResult(headers = rows.first(), rows = rows.drop(1))
    }

    private fun getCellValue(cell: Cell): String = when (cell.cellType) {
        CellType.STRING -> cell.stringCellValue.trim()
        CellType.NUMERIC -> if (DateUtil.isCellDateFormatted(cell)) {
            cell.localDateTimeCellValue.toString()
        } else {
            val num = cell.numericCellValue
            if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
        }
        CellType.BOOLEAN -> cell.booleanCellValue.toString()
        CellType.BLANK -> ""
        else -> ""
    }
}
