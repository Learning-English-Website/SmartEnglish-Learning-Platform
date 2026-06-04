package com.example.smartenglish.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import androidx.compose.ui.platform.LocalContext

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)
private val BadgeRed = Color(0xFFFF3B30)

// Fallback Cute Avatar URL
private const val DEFAULT_AVATAR_URL = "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=150&auto=format&fit=crop"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateToEditProfile: () -> Unit,
    onNavigateToAchievements: () -> Unit = {},
    onNavigateToUserManagement: () -> Unit = {},
    onNavigateBack: () -> Unit = {},
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadProfile(isSilent = true)
    }

    LaunchedEffect(uiState) {
        if (uiState is ProfileUiState.Error) {
            val errMsg = (uiState as ProfileUiState.Error).message
            if (errMsg.contains("token", ignoreCase = true) || errMsg.contains("401")) {
                onLogout()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DeepDarkNavy, DarkBackground)
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // 1. TOP TRANSPARENT HEADER APP BAR
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color.White.copy(alpha = 0.08f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Text(
                        text = "Hồ sơ",
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }

                IconButton(
                    onClick = onNavigateToEditProfile,
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color.White.copy(alpha = 0.08f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Edit Profile",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // 2. MAIN STATE VIEWS
            when (val state = uiState) {
                is ProfileUiState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = QuizletBlue)
                    }
                }
                is ProfileUiState.Success -> {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .padding(horizontal = 24.dp)
                            .verticalScroll(rememberScrollState()),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Spacer(modifier = Modifier.height(16.dp))

                        // Gorgeous Circular Avatar
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(CircleShape)
                                .border(2.dp, Color.White.copy(alpha = 0.15f), CircleShape)
                                .background(IconBg),
                            contentAlignment = Alignment.Center
                        ) {
                            val avatarUrl = state.user.avatar
                            val email = state.user.email
                            val fullAvatarUrl = if (!avatarUrl.isNullOrBlank()) {
                                if (avatarUrl.startsWith("/")) {
                                    "https://smartenglish-api-1iby.onrender.com$avatarUrl"
                                } else {
                                    avatarUrl
                                }
                            } else {
                                "https://api.dicebear.com/7.x/initials/png?seed=$email&backgroundColor=4255ff"
                            }
                            AsyncImage(
                                model = fullAvatarUrl,
                                contentDescription = "Profile Avatar",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Username & Email
                        Text(
                            text = state.user.username,
                            color = Color.White,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = state.user.email,
                            color = TextGray,
                            fontSize = 14.sp
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        // Role & Member Cards
                        ProfileInfoCard(
                            icon = Icons.Default.Shield,
                            label = "Vai trò",
                            value = state.user.role.replaceFirstChar { it.uppercase() }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        val context = LocalContext.current
                        if (state.user.premium.lowercase() != "premium") {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = CardBg)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(40.dp)
                                                .background(IconBg, shape = RoundedCornerShape(10.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Star,
                                                contentDescription = null,
                                                tint = IconCyan,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(16.dp))

                                        Column {
                                            Text(
                                                text = "Plan",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = TextGray
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = state.user.premium.replaceFirstChar { it.uppercase() },
                                                color = Color.White,
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            try {
                                                val intent = android.content.Intent(
                                                    android.content.Intent.ACTION_VIEW,
                                                    android.net.Uri.parse("https://smart-english-learning-platform.vercel.app/premium")
                                                )
                                                context.startActivity(intent)
                                            } catch (e: Exception) {
                                                android.util.Log.e("ProfileScreen", "Failed to open premium link", e)
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFFFBBF24),
                                            contentColor = Color.Black
                                        ),
                                        shape = RoundedCornerShape(10.dp),
                                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                                        modifier = Modifier.height(34.dp)
                                    ) {
                                        Text(
                                            text = "Nâng cấp",
                                            color = Color.Black,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                            }
                        } else {
                            ProfileInfoCard(
                                icon = Icons.Default.Star,
                                label = "Plan",
                                value = state.user.premium.replaceFirstChar { it.uppercase() }
                            )
                        }

                        if (state.user.role.equals("admin", ignoreCase = true)) {
                            Spacer(modifier = Modifier.height(12.dp))
                            AdminActionCard(
                                onClick = onNavigateToUserManagement
                            )
                        }

                        state.user.createdAt?.let { date ->
                            Spacer(modifier = Modifier.height(12.dp))
                            ProfileInfoCard(
                                icon = Icons.Default.CalendarMonth,
                                label = "Thành viên từ",
                                value = formatDate(date)
                            )
                        }

                        Spacer(modifier = Modifier.height(36.dp))



                        // Achievements button
                        OutlinedButton(
                            onClick = onNavigateToAchievements,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(50.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color.White
                            ),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = Brush.linearGradient(
                                    colors = listOf(Color.White.copy(alpha = 0.2f), Color.White.copy(alpha = 0.05f))
                                )
                            )
                        ) {
                            Text("🏆", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Huy hiệu của tôi", fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Logout button
                        OutlinedButton(
                            onClick = { viewModel.logout(onLogout) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(50.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = BadgeRed
                            ),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = Brush.linearGradient(
                                    colors = listOf(BadgeRed.copy(alpha = 0.3f), BadgeRed.copy(alpha = 0.1f))
                                )
                            )
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = BadgeRed)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Đăng xuất", fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
                is ProfileUiState.Error -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Default.WifiOff,
                                contentDescription = null,
                                modifier = Modifier.size(54.dp),
                                tint = TextGray
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Lỗi khi tải thông tin hồ sơ",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Button(
                                onClick = { viewModel.loadProfile() },
                                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
                            ) {
                                Text("Thử lại", color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileInfoCard(
    icon: ImageVector,
    label: String,
    value: String,
    action: (@Composable () -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = CardBg
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(IconBg, shape = RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = IconCyan,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextGray
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = value,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            if (action != null) {
                action()
            }
        }
    }
}

@Composable
private fun AdminActionCard(
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, QuizletBlue.copy(alpha = 0.28f), RoundedCornerShape(16.dp)),
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = CardBg
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(QuizletBlue.copy(alpha = 0.18f), shape = RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.AdminPanelSettings,
                    contentDescription = null,
                    tint = QuizletBlue,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Quản lý người dùng",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Xem danh sách, chi tiết, Premium và xóa user",
                    color = TextGray,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = TextGray
            )
        }
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val parts = dateString.split("T")
        if (parts.isNotEmpty()) parts[0] else dateString
    } catch (e: Exception) {
        dateString
    }
}
