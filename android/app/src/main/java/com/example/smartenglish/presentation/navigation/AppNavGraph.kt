package com.example.smartenglish.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.example.smartenglish.presentation.auth.ForgotPasswordScreen
import com.example.smartenglish.presentation.auth.LoginScreen
import com.example.smartenglish.presentation.auth.OtpScreen
import com.example.smartenglish.presentation.auth.OtpResetPasswordScreen
import com.example.smartenglish.presentation.auth.RegisterScreen
import com.example.smartenglish.presentation.auth.ResetPasswordScreen
import com.example.smartenglish.presentation.home.HomeScreen
import com.example.smartenglish.presentation.profile.EditProfileScreen
import com.example.smartenglish.presentation.profile.ProfileScreen
import com.example.smartenglish.presentation.study.StudyScreen
import com.example.smartenglish.presentation.study.FlashcardStudyScreen
import com.example.smartenglish.presentation.sets.SetListScreen
import com.example.smartenglish.presentation.sets.SetDetailScreen
import com.example.smartenglish.presentation.cards.CardListScreen
import com.example.smartenglish.presentation.cards.CardEditorScreen
import com.example.smartenglish.presentation.search.SearchScreen
import com.example.smartenglish.presentation.browse.BrowseScreen

@Composable
fun AppNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route,
        modifier = modifier
    ) {
        // ==================== AUTH SCREENS ====================
        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onNavigateToForgotPassword = {
                    navController.navigate(Screen.ForgotPassword.route)
                },
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onNavigateToLogin = {
                    navController.popBackStack()
                },
                onRegisterSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToOtp = { email ->
                    navController.navigate(Screen.Otp.createRoute(email))
                }
            )
        }

        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToOtpResetPassword = { email ->
                    navController.navigate(Screen.OtpResetPassword.createRoute(email))
                }
            )
        }

        composable(
            route = Screen.OtpResetPassword.route,
            arguments = listOf(
                navArgument("email") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val email = backStackEntry.arguments?.getString("email") ?: ""
            OtpResetPasswordScreen(
                email = email,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToResetPassword = { verifiedEmail, otp ->
                    navController.navigate(Screen.ResetPassword.createRoute(verifiedEmail, otp)) {
                        popUpTo(Screen.OtpResetPassword.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.ResetPassword.route,
            arguments = listOf(
                navArgument("email") { type = NavType.StringType },
                navArgument("otp") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val email = backStackEntry.arguments?.getString("email") ?: ""
            val otp = backStackEntry.arguments?.getString("otp") ?: ""
            ResetPasswordScreen(
                email = email,
                otp = otp,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.Otp.route,
            arguments = listOf(
                navArgument("email") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val email = backStackEntry.arguments?.getString("email") ?: ""
            OtpScreen(
                email = email,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        // ==================== MAIN SCREENS ====================
        
        // Home Screen
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onNavigateToLibrary = {
                    navController.navigate(Screen.Library.route)
                },
                onNavigateToStudy = {
                    navController.navigate(Screen.Study.route)
                },
                onNavigateToCreateSet = {
                    navController.navigate(Screen.Library.route)
                },
                onNavigateToSearch = {
                    navController.navigate(Screen.Search.route)
                },
                onNavigateToSetDetail = { setId ->
                    navController.navigate(Screen.SetDetail.createRoute(setId))
                }
            )
        }

        // Library Screen (formerly Vocabulary)
        composable(Screen.Library.route) {
            SetListScreen(
                onNavigateToSetDetail = { setId ->
                    navController.navigate(Screen.SetDetail.createRoute(setId))
                },
                onNavigateToCreateSet = {
                    // CreateSetDialog is shown within SetListScreen
                },
                onNavigateToBrowse = {
                    navController.navigate(Screen.Browse.route)
                }
            )
        }

        // Study Screen
        composable(Screen.Study.route) {
            StudyScreen(
                onNavigateToStudyMode = { setId ->
                    navController.navigate(Screen.StudyMode.createRoute(setId))
                }
            )
        }

        // Profile Screen
        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateToEditProfile = {
                    navController.navigate(Screen.EditProfile.route)
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.EditProfile.route) {
            EditProfileScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // ==================== WEEK 2: SETS & CARDS SCREENS ====================

        // Set List Screen
        composable(Screen.SetList.route) {
            SetListScreen(
                onNavigateToSetDetail = { setId ->
                    navController.navigate(Screen.SetDetail.createRoute(setId))
                },
                onNavigateToCreateSet = {
                    // CreateSetDialog is shown within SetListScreen
                },
                onNavigateToBrowse = {
                    navController.navigate(Screen.Browse.route)
                }
            )
        }

        // Set Detail Screen
        composable(
            route = Screen.SetDetail.route,
            arguments = listOf(
                navArgument("setId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val setId = backStackEntry.arguments?.getString("setId") ?: ""
            SetDetailScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToStudy = { id ->
                    navController.navigate(Screen.StudyMode.createRoute(id))
                },
                onNavigateToAddCards = { id ->
                    navController.navigate(Screen.CardList.createRoute(id))
                }
            )
        }

        // Card List Screen
        composable(
            route = Screen.CardList.route,
            arguments = listOf(
                navArgument("setId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val setId = backStackEntry.arguments?.getString("setId") ?: ""
            CardListScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToStudy = { id ->
                    navController.navigate(Screen.StudyMode.createRoute(id))
                },
                onNavigateToEditCard = { setId, cardId ->
                    navController.navigate(Screen.CardEditor.createRoute(setId, cardId))
                },
                onNavigateToAddCard = { id ->
                    navController.navigate(Screen.CardEditor.createRoute(id, null))
                }
            )
        }

        // Card Editor Screen
        composable(
            route = Screen.CardEditor.route,
            arguments = listOf(
                navArgument("setId") { type = NavType.StringType },
                navArgument("cardId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            CardEditorScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // Flashcard Study Mode Screen
        composable(
            route = Screen.StudyMode.route,
            arguments = listOf(
                navArgument("setId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val setId = backStackEntry.arguments?.getString("setId") ?: ""
            FlashcardStudyScreen(
                setId = setId,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // Browse Screen
        composable(Screen.Browse.route) {
            BrowseScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToSetDetail = { setId ->
                    navController.navigate(Screen.SetDetail.createRoute(setId))
                }
            )
        }

        // Search Screen
        composable(Screen.Search.route) {
            SearchScreen(
                onNavigateToSetDetail = { setId ->
                    navController.navigate(Screen.SetDetail.createRoute(setId))
                },
                onDismiss = {
                    navController.popBackStack()
                }
            )
        }
    }
}
