package com.example.smartenglish

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.smartenglish.presentation.navigation.AppNavGraph
import com.example.smartenglish.presentation.navigation.BottomNavBar
import com.example.smartenglish.presentation.navigation.Screen
import com.example.smartenglish.ui.theme.SmartEnglishTheme
import javax.inject.Inject
import com.example.smartenglish.util.TokenManager
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartEnglishTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val showBottomBar = currentRoute in Screen.bottomNavItems.map { it.route }

                var isLoggedIn by remember { mutableStateOf(tokenManager.isLoggedIn()) }

                val startDestination = if (isLoggedIn) {
                    Screen.Home.route
                } else {
                    Screen.Login.route
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        if (showBottomBar) {
                            BottomNavBar(navController = navController)
                        }
                    }
                ) { innerPadding ->
                    AppNavGraph(
                        navController = navController,
                        startDestination = startDestination,
                        onLoginSuccess = {
                            isLoggedIn = true
                        },
                        onLogout = {
                            isLoggedIn = false
                        },
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}