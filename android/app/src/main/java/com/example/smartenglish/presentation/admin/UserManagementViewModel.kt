package com.example.smartenglish.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.repository.AdminRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class UserManagementViewModel @Inject constructor(
    private val adminRepository: AdminRepository
) : ViewModel() {

    private val _state = MutableStateFlow(UserManagementState())
    val state: StateFlow<UserManagementState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadUsers()
    }

    fun updateSearchQuery(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            loadUsers(page = 1)
        }
    }

    fun updateRoleFilter(filter: AdminRoleFilter) {
        _state.value = _state.value.copy(selectedRoleFilter = filter)
        loadUsers(page = 1)
    }

    fun refresh() {
        loadUsers(page = 1, isRefreshing = true)
    }

    fun loadNextPage() {
        val currentState = _state.value
        if (currentState.isLoading || currentState.isRefreshing || currentState.isLoadingMore) return
        if (currentState.currentPage >= currentState.totalPages) return
        loadUsers(page = currentState.currentPage + 1, append = true)
    }

    fun loadUserDetail(userId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(
                isDetailLoading = true,
                error = null,
                actionMessage = null
            )
            when (val result = adminRepository.getUserById(userId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        selectedUser = result.data,
                        isDetailLoading = false
                    )
                }
                is ApiResult.Error -> {
                    _state.value = _state.value.copy(
                        isDetailLoading = false,
                        error = result.message
                    )
                }
                else -> Unit
            }
        }
    }

    fun dismissUserDetail() {
        _state.value = _state.value.copy(selectedUser = null)
    }

    fun updateSelectedUserPremium(premium: String) {
        val selectedUser = _state.value.selectedUser ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(
                isUpdatingPremium = true,
                error = null,
                actionMessage = null
            )
            when (
                val result = adminRepository.updateUser(
                    userId = selectedUser.id,
                    username = selectedUser.username,
                    avatar = selectedUser.avatar,
                    premium = premium
                )
            ) {
                is ApiResult.Success -> {
                    val updatedUser = result.data
                    _state.value = _state.value.copy(
                        users = _state.value.users.map { user ->
                            if (user.id == updatedUser.id) updatedUser else user
                        },
                        selectedUser = updatedUser,
                        isUpdatingPremium = false,
                        actionMessage = "Cập nhật Premium thành công"
                    )
                }
                is ApiResult.Error -> {
                    _state.value = _state.value.copy(
                        isUpdatingPremium = false,
                        error = result.message
                    )
                }
                else -> Unit
            }
        }
    }

    fun deleteSelectedUser() {
        val selectedUser = _state.value.selectedUser ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(
                isDeletingUser = true,
                error = null,
                actionMessage = null
            )
            when (val result = adminRepository.deleteUser(selectedUser.id)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        users = _state.value.users.filterNot { it.id == selectedUser.id },
                        selectedUser = null,
                        isDeletingUser = false,
                        totalUsers = (_state.value.totalUsers - 1).coerceAtLeast(0),
                        totalPremiumUsers = (_state.value.totalPremiumUsers - if (selectedUser.premium.equals("premium", ignoreCase = true)) 1 else 0).coerceAtLeast(0),
                        totalVerifiedUsers = (_state.value.totalVerifiedUsers - if (selectedUser.isVerified) 1 else 0).coerceAtLeast(0),
                        actionMessage = "Xóa người dùng thành công"
                    )
                }
                is ApiResult.Error -> {
                    _state.value = _state.value.copy(
                        isDeletingUser = false,
                        error = result.message.substringAfter("message\":\"", result.message)
                            .substringBefore("\"}")
                            .substringBefore("\",\"")
                    )
                }
                else -> Unit
            }
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(error = null, actionMessage = null)
    }

    private fun loadUsers(
        page: Int = 1,
        append: Boolean = false,
        isRefreshing: Boolean = false
    ) {
        viewModelScope.launch {
            val currentState = _state.value
            _state.value = currentState.copy(
                isLoading = !append && !isRefreshing,
                isRefreshing = isRefreshing,
                isLoadingMore = append,
                error = null,
                actionMessage = null
            )

            when (
                val result = adminRepository.getUsers(
                    search = currentState.searchQuery.trim().takeIf { it.isNotBlank() },
                    role = currentState.selectedRoleFilter.backendValue,
                    page = page,
                    limit = 10
                )
            ) {
                is ApiResult.Success -> {
                    val pageData = result.data
                    _state.value = _state.value.copy(
                        users = if (append) _state.value.users + pageData.users else pageData.users,
                        isLoading = false,
                        isRefreshing = false,
                        isLoadingMore = false,
                        hasLoadedOnce = true,
                        currentPage = pageData.page,
                        totalPages = pageData.pages,
                        totalUsers = pageData.total,
                        totalPremiumUsers = pageData.premiumUsers,
                        totalVerifiedUsers = pageData.verifiedUsers
                    )
                }
                is ApiResult.Error -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        isLoadingMore = false,
                        hasLoadedOnce = true,
                        error = result.message
                    )
                }
                else -> Unit
            }
        }
    }
}
