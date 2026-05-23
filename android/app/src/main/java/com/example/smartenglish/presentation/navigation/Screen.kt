package com.example.smartenglish.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
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

    // Main screens (bottom nav)
    data object Home : Screen("home", "Home", Icons.Default.Home)
    data object Vocabulary : Screen("vocabulary", "Vocabulary", Icons.Default.MenuBook)
    data object Study : Screen("study", "Study", Icons.Default.School)
    data object Progress : Screen("progress", "Progress", Icons.Default.BarChart)
    data object Profile : Screen("profile", "Profile", Icons.Default.Person)

    // Profile sub-screens
    data object EditProfile : Screen("edit_profile", "Edit Profile", Icons.Default.Person)

    companion object {
        val bottomNavItems = listOf(Home, Vocabulary, Study, Progress, Profile)
    }
}
