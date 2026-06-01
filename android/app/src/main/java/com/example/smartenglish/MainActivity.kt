package com.example.smartenglish

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.smartenglish.presentation.navigation.AppNavGraph
import com.example.smartenglish.presentation.navigation.BottomNavBar
import com.example.smartenglish.presentation.navigation.Screen
import com.example.smartenglish.ui.theme.SmartEnglishTheme
import javax.inject.Inject
import com.example.smartenglish.util.TokenManager
import com.example.smartenglish.presentation.sets.CreateSetDialog
import com.example.smartenglish.presentation.sets.CreateFolderDialog
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
                var showCreateBottomSheet by remember { mutableStateOf(false) }
                var showCreateSetDialog by remember { mutableStateOf(false) }
                var showCreateFolderDialog by remember { mutableStateOf(false) }

                val startDestination = if (isLoggedIn) {
                    Screen.Home.route
                } else {
                    Screen.Login.route
                }

                @OptIn(ExperimentalMaterial3Api::class)
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        if (showBottomBar) {
                            BottomNavBar(
                                navController = navController,
                                onCreateClick = {
                                    showCreateBottomSheet = true
                                }
                            )
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
                        innerPadding = innerPadding,
                        modifier = Modifier.fillMaxSize()
                    )

                    if (showCreateBottomSheet) {
                        ModalBottomSheet(
                            onDismissRequest = { showCreateBottomSheet = false },
                            containerColor = Color(0xFF07091E),
                            dragHandle = { BottomSheetDefaults.DragHandle(color = Color.White.copy(alpha = 0.3f)) }
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF07091E))
                                    .padding(horizontal = 24.dp, vertical = 24.dp)
                                    .navigationBarsPadding(),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                // Card 1: Học phần
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(72.dp)
                                        .background(Color(0xFF161A3F), shape = RoundedCornerShape(16.dp))
                                        .clickable {
                                            showCreateBottomSheet = false
                                            showCreateSetDialog = true
                                        }
                                        .padding(horizontal = 20.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(44.dp)
                                            .background(Color(0xFF1E214A), shape = RoundedCornerShape(10.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Style,
                                            contentDescription = null,
                                            tint = Color(0xFF38BDF8),
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Text(
                                        text = "Học phần",
                                        color = Color.White,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                // Card 2: Thư mục
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(72.dp)
                                        .background(Color(0xFF161A3F), shape = RoundedCornerShape(16.dp))
                                        .clickable {
                                            showCreateBottomSheet = false
                                            showCreateFolderDialog = true
                                        }
                                        .padding(horizontal = 20.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(44.dp)
                                            .background(Color(0xFF1E214A), shape = RoundedCornerShape(10.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Folder,
                                            contentDescription = null,
                                            tint = Color(0xFF38BDF8),
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Text(
                                        text = "Thư mục",
                                        color = Color.White,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    if (showCreateSetDialog) {
                        CreateSetDialog(
                            onDismiss = { showCreateSetDialog = false },
                            onCreated = { showCreateSetDialog = false }
                        )
                    }

                    if (showCreateFolderDialog) {
                        CreateFolderDialog(
                            onDismiss = { showCreateFolderDialog = false },
                            onCreated = { showCreateFolderDialog = false }
                        )
                    }
                }
            }
        }
    }
}