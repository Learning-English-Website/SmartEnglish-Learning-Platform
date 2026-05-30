package com.example.smartenglish.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.ProgressRepository
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeStats(
    val streak: Int = 0,
    val xp: Int = 0,
    val level: Int = 1,
    val totalSets: Int = 0,
    val masteredCards: Int = 0,
    val dueToday: Int = 0          // Số thẻ đến hạn hôm nay (từ API thật)
)

sealed class HomeUiState {
    data object Loading : HomeUiState()
    data class Success(
        val user: User,
        val stats: HomeStats,
        val recentSets: List<FlashcardSet> = emptyList()
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val setRepository: SetRepository,
    private val progressRepository: ProgressRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading

            // Chạy song song 3 requests
            val userDeferred = async {
                runCatching { userRepository.getMe() }.getOrElse { ApiResult.Error("Network error") }
            }
            val setsDeferred = async {
                runCatching { setRepository.getSets().first() }.getOrElse { emptyList() }
            }
            val statsDeferred = async {
                runCatching { progressRepository.getOverallStats() }.getOrElse { ApiResult.Error("") }
            }

            val userResult = userDeferred.await()
            val sets = setsDeferred.await()
            val statsResult = statsDeferred.await()

            when (userResult) {
                is ApiResult.Success -> {
                    val user = userResult.data

                    // Lấy stats thật từ API (masteredCards, dueToday)
                    val progressStats = when (statsResult) {
                        is ApiResult.Success -> statsResult.data
                        else -> null
                    }

                    _uiState.value = HomeUiState.Success(
                        user = user,
                        stats = HomeStats(
                            streak = user.streak.current,
                            xp = user.gamification.xp,
                            level = user.gamification.level,
                            totalSets = sets.size,
                            masteredCards = progressStats?.masteredCards ?: 0,
                            dueToday = progressStats?.dueToday ?: 0
                        ),
                        recentSets = sets.take(5)
                    )
                }
                is ApiResult.Error -> _uiState.value = HomeUiState.Error(userResult.message)
                is ApiResult.Loading -> _uiState.value = HomeUiState.Loading
                is ApiResult.EmailVerificationRequired -> _uiState.value = HomeUiState.Error("Email verification required")
            }
        }
    }

    // Giữ alias cũ cho compatibility
    fun loadUser() = loadData()
}
