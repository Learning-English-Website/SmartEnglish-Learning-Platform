package com.example.smartenglish.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Folder
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {

    // Auth screens
    data object Login : Screen("login", "Login", Icons.Default.Person)
    data object Register : Screen("register", "Register", Icons.Default.Person)
    data object ForgotPassword : Screen("forgot_password", "Forgot Password", Icons.Default.Person)
    data object Otp : Screen("otp/{email}", "OTP Verification", Icons.Default.Person) {
        fun createRoute(email: String) = "otp/$email"
    }
    data object OtpResetPassword : Screen("otp_reset_password/{email}", "OTP Reset Password", Icons.Default.Person) {
        fun createRoute(email: String) = "otp_reset_password/$email"
    }
    data object ResetPassword : Screen("reset_password/{email}/{otp}", "Reset Password", Icons.Default.Person) {
        fun createRoute(email: String, otp: String) = "reset_password/$email/$otp"
    }

    // Main screens (bottom nav) - Quizlet style
    data object Home : Screen("home", "Trang chủ", Icons.Default.Home)
    data object Create : Screen("create", "Tạo", Icons.Default.Add)
    data object Library : Screen("library", "Thư viện", Icons.Default.LibraryBooks)
    data object Study : Screen("study", "Study", Icons.Default.School)
    data object Profile : Screen("profile", "Profile", Icons.Default.Person)

    // Profile sub-screens
    data object EditProfile : Screen("edit_profile", "Edit Profile", Icons.Default.Person)

    // Week 2: Sets & Cards screens
    data object SetList : Screen("sets", "My Sets", Icons.Default.LibraryBooks)
    data object SetDetail : Screen("set/{setId}", "Set Detail", Icons.Default.LibraryBooks) {
        fun createRoute(setId: String) = "set/$setId"
    }
    data object CardList : Screen("cards/{setId}", "Cards", Icons.Default.School) {
        fun createRoute(setId: String) = "cards/$setId"
    }
    data object CardEditor : Screen("card/{setId}/{cardId}", "Edit Card", Icons.Default.School) {
        fun createRoute(setId: String, cardId: String?) = "card/$setId/${cardId ?: "new"}"
    }
    data object StudyMode : Screen("study/{setId}", "Study", Icons.Default.School) {
        fun createRoute(setId: String) = "study/$setId"
    }
    data object Browse : Screen("browse", "Browse", Icons.Default.Search)
    data object Search : Screen("search", "Search", Icons.Default.Search)
    data object Achievements : Screen("achievements", "Huy hiệu", Icons.Default.Person)

    data object FolderDetail : Screen("folder/{folderId}", "Thư mục", Icons.Default.Folder) {
        fun createRoute(folderId: String) = "folder/$folderId"
    }

    companion object {
        val bottomNavItems = listOf(Home, Create, Library)
    }
}
