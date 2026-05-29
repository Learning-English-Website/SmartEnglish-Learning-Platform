package com.example.smartenglish.presentation.components

import com.example.smartenglish.util.ColumnMapper

data class ImportUiState(
    val headers: List<String> = emptyList(),
    val rows: List<List<String>> = emptyList(),
    val mapping: ColumnMapper.Mapping = ColumnMapper.Mapping(-1, -1),
    val isImporting: Boolean = false,
    val importSuccess: Boolean = false,
    val importedCount: Int = 0,
    val error: String? = null
)
