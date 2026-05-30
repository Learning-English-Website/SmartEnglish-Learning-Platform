package com.example.smartenglish.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.Achievement
import com.example.smartenglish.domain.repository.GamificationRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AchievementsState(
    val achievements: List<Achievement> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
) {
    val unlockedCount get() = achievements.count { it.unlocked }
    val totalCount get() = achievements.size
}

@HiltViewModel
class AchievementsViewModel @Inject constructor(
    private val gamificationRepository: GamificationRepository
) : ViewModel() {

    private val _state = MutableStateFlow(AchievementsState())
    val state: StateFlow<AchievementsState> = _state.asStateFlow()

    init { loadAchievements() }

    fun loadAchievements() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            when (val result = gamificationRepository.getAchievements()) {
                is ApiResult.Success -> _state.value = AchievementsState(
                    achievements = result.data,
                    isLoading = false
                )
                is ApiResult.Error -> _state.value = AchievementsState(
                    isLoading = false,
                    error = result.message
                )
                else -> _state.value = _state.value.copy(isLoading = false)
            }
        }
    }
}
