package com.example.smartenglish.presentation.admin

import com.example.smartenglish.domain.model.User

enum class AdminRoleFilter(val backendValue: String?, val displayName: String) {
    ALL(null, "Tất cả"),
    ADMIN("admin", "Admin"),
    STUDENT("student", "Student")
}

data class UserManagementState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasLoadedOnce: Boolean = false,
    val searchQuery: String = "",
    val selectedRoleFilter: AdminRoleFilter = AdminRoleFilter.ALL,
    val currentPage: Int = 1,
    val totalPages: Int = 1,
    val totalUsers: Int = 0,
    val totalPremiumUsers: Int = 0,
    val totalVerifiedUsers: Int = 0,
    val selectedUser: User? = null,
    val isDetailLoading: Boolean = false,
    val isUpdatingPremium: Boolean = false,
    val isDeletingUser: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null
) {
    val resultRangeText: String
        get() {
            if (users.isEmpty() || totalUsers == 0) return "Không có người dùng nào"
            val start = ((currentPage - 1) * PAGE_SIZE) + 1
            val end = (start + users.size - 1).coerceAtMost(totalUsers)
            return "Hiển thị $start-$end / $totalUsers người dùng"
        }

    companion object {
        const val PAGE_SIZE = 10
    }
}
