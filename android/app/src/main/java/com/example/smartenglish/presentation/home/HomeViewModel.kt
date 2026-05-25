package com.example.smartenglish.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
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
    val masteredCards: Int = 0
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
    private val setRepository: SetRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadUser()
    }

    fun loadUser() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading

            when (val result = userRepository.getMe()) {
                is ApiResult.Success -> {
                    val user = result.data
                    val sets = try {
                        setRepository.getSets().first()
                    } catch (e: Exception) {
                        emptyList()
                    }

                    val totalSets = sets.size
                    val masteredCards = sets.sumOf { it.cardCount }

                    _uiState.value = HomeUiState.Success(
                        user = user,
                        stats = HomeStats(
                            streak = user.streak.current,
                            xp = user.gamification.xp,
                            level = user.gamification.level,
                            totalSets = totalSets,
                            masteredCards = masteredCards
                        ),
                        recentSets = sets.take(5)
                    )
                }
                is ApiResult.Error -> _uiState.value = HomeUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = HomeUiState.Loading
                is ApiResult.EmailVerificationRequired -> _uiState.value = HomeUiState.Error("Email verification required")
            }
        }
    }
}
