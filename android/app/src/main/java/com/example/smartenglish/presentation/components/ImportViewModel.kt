package com.example.smartenglish.presentation.components

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.data.remote.dto.CreateCardRequest
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.ColumnMapper
import com.example.smartenglish.util.FileImportHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ImportViewModel @Inject constructor(
    private val cardRepository: CardRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ImportUiState())
    val uiState: StateFlow<ImportUiState> = _uiState.asStateFlow()

    fun setParsedData(result: FileImportHelper.CsvParseResult, mapping: ColumnMapper.Mapping) {
        _uiState.value = ImportUiState(
            headers = result.headers,
            rows = result.rows,
            mapping = mapping
        )
    }

    fun updateMapping(mapping: ColumnMapper.Mapping) {
        _uiState.value = _uiState.value.copy(mapping = mapping)
    }

    fun clearData() {
        _uiState.value = ImportUiState()
    }

    fun importCards(setId: String) {
        val state = _uiState.value
        if (state.mapping.front < 0 || state.mapping.back < 0) {
            _uiState.value = state.copy(error = "Please map required columns: Front and Back")
            return
        }

        viewModelScope.launch {
            _uiState.value = state.copy(isImporting = true, error = null, importSuccess = false)

            try {
                val cards = state.rows.mapNotNull { row ->
                    val front = row.getOrNull(state.mapping.front)?.trim()
                    val back = row.getOrNull(state.mapping.back)?.trim()

                    if (front.isNullOrBlank() || back.isNullOrBlank()) return@mapNotNull null

                    CreateCardRequest(
                        front = front,
                        back = back,
                        pronunciation = col(state.mapping.pronunciation, row),
                        example = col(state.mapping.example, row),
                        note = col(state.mapping.note, row)
                        // Week 3: tạm bỏ qua collocation + relatedWords
                    )
                }

                if (cards.isEmpty()) {
                    _uiState.value = _uiState.value.copy(isImporting = false, error = "No valid cards found")
                    return@launch
                }

                when (val result = cardRepository.bulkCreateCards(setId, cards)) {
                    is ApiResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isImporting = false,
                            importSuccess = true,
                            importedCount = result.data.size
                        )
                    }
                    is ApiResult.Error -> {
                        _uiState.value = _uiState.value.copy(isImporting = false, error = result.message)
                    }
                    else -> {
                        _uiState.value = _uiState.value.copy(isImporting = false, error = "Import failed")
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isImporting = false,
                    error = e.message ?: "Import failed"
                )
            }
        }
    }

    private fun col(idx: Int, row: List<String>): String? =
        if (idx >= 0) row.getOrNull(idx)?.trim()?.takeIf { it.isNotBlank() } else null
}
