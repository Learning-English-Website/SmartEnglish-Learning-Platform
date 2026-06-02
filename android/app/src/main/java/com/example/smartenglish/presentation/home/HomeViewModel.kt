package com.example.smartenglish.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.Streak
import com.example.smartenglish.domain.model.Gamification
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
import com.example.smartenglish.domain.repository.DownloadRepository
import com.example.smartenglish.util.NetworkMonitor
import com.example.smartenglish.data.sync.SyncManager
import com.example.smartenglish.data.sync.SyncScheduler
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
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
    private val progressRepository: ProgressRepository,
    private val downloadRepository: DownloadRepository,
    private val networkMonitor: NetworkMonitor,
    private val syncManager: SyncManager,
    private val syncScheduler: SyncScheduler
) : ViewModel() {

    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline

    val pendingCount: StateFlow<Int> = downloadRepository.getPendingSyncCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun syncNow() {
        syncScheduler.triggerImmediateSync()
        viewModelScope.launch {
            syncManager.processPendingOperations()
        }
    }

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
        observeNetworkChanges()
    }

    private fun observeNetworkChanges() {
        viewModelScope.launch {
            var wasOffline = false
            networkMonitor.isOnline.collect { online ->
                if (online && wasOffline) {
                    loadData(isSilent = true)
                }
                wasOffline = !online
            }
        }
    }

    fun loadData(isSilent: Boolean = false) {
        viewModelScope.launch {
            if (!isSilent) {
                _uiState.value = HomeUiState.Loading
            }

            // If offline, immediately return success state with cached sets and guest profile
            if (!networkMonitor.isOnline.value) {
                val sets = runCatching { setRepository.getMySetsList() }.getOrElse { emptyList() }
                val offlineUser = User(
                    id = "offline_user",
                    email = "offline@memoris.com",
                    username = "Người dùng ngoại tuyến",
                    role = "user",
                    avatar = null,
                    premium = "none",
                    streak = Streak(current = 0, longest = 0, lastStudyDate = null),
                    gamification = Gamification(xp = 0, level = 1),
                    createdAt = null
                )
                _uiState.value = HomeUiState.Success(
                    user = offlineUser,
                    stats = HomeStats(
                        streak = 0,
                        xp = 0,
                        level = 1,
                        totalSets = sets.size,
                        masteredCards = 0,
                        dueToday = 0
                    ),
                    recentSets = sets.take(5)
                )
                return@launch
            }

            // Chạy song song 3 requests
            val userDeferred = async {
                runCatching { userRepository.getMe() }.getOrElse { ApiResult.Error("Network error") }
            }
            val setsDeferred = async {
                runCatching { setRepository.getMySetsList() }.getOrElse { emptyList() }
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
                is ApiResult.Error -> {
                    // Fallback to offline guest profile if we have cached sets or if we are offline
                    if (sets.isNotEmpty()) {
                        val offlineUser = User(
                            id = "offline_user",
                            email = "offline@memoris.com",
                            username = "Người dùng ngoại tuyến",
                            role = "user",
                            avatar = null,
                            premium = "none",
                            streak = Streak(current = 0, longest = 0, lastStudyDate = null),
                            gamification = Gamification(xp = 0, level = 1),
                            createdAt = null
                        )
                        _uiState.value = HomeUiState.Success(
                            user = offlineUser,
                            stats = HomeStats(
                                streak = 0,
                                xp = 0,
                                level = 1,
                                totalSets = sets.size,
                                masteredCards = 0,
                                dueToday = 0
                            ),
                            recentSets = sets.take(5)
                        )
                    } else {
                        _uiState.value = HomeUiState.Error(userResult.message)
                    }
                }
                is ApiResult.Loading -> _uiState.value = HomeUiState.Loading
                is ApiResult.EmailVerificationRequired -> _uiState.value = HomeUiState.Error("Email verification required")
            }
        }
    }

    // Giữ alias cũ cho compatibility
    fun loadUser() = loadData()
}
