package com.example.smartenglish.presentation.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

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
fun EditProfileScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit,
    viewModel: EditProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val username by viewModel.username.collectAsState()
    val avatar by viewModel.avatar.collectAsState()
    val isUploading by viewModel.isUploading.collectAsState()
    val uploadError by viewModel.uploadError.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var cachedUser by remember { mutableStateOf<com.example.smartenglish.domain.model.User?>(null) }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { selectedUri ->
            coroutineScope.launch(Dispatchers.IO) {
                try {
                    val inputStream = context.contentResolver.openInputStream(selectedUri)
                    val bytes = inputStream?.readBytes()
                    if (bytes != null) {
                        var fileName = "avatar_${System.currentTimeMillis()}.jpg"
                        context.contentResolver.query(selectedUri, null, null, null, null)?.use { cursor ->
                            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                            if (nameIndex != -1 && cursor.moveToFirst()) {
                                val name = cursor.getString(nameIndex)
                                if (!name.isNullOrBlank()) {
                                    fileName = name
                                }
                            }
                        }
                        viewModel.uploadAvatar(bytes, fileName)
                    }
                } catch (e: Exception) {
                    coroutineScope.launch {
                        snackbarHostState.showSnackbar("Lỗi đọc tệp ảnh: ${e.message}")
                    }
                }
            }
        }
    }

    LaunchedEffect(uploadError) {
        uploadError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearUploadError()
        }
    }

    LaunchedEffect(uiState) {
        when (uiState) {
            is EditProfileUiState.Success -> {
                cachedUser = (uiState as EditProfileUiState.Success).user
            }
            is EditProfileUiState.SaveSuccess -> {
                android.widget.Toast.makeText(context, "Thông tin hồ sơ đã được cập nhật!", android.widget.Toast.LENGTH_SHORT).show()
                onNavigateBack()
            }
            is EditProfileUiState.Error -> {
                val errMsg = (uiState as EditProfileUiState.Error).message
                if (errMsg.contains("token", ignoreCase = true) || errMsg.contains("401")) {
                    onLogout()
                } else {
                    snackbarHostState.showSnackbar(errMsg)
                }
            }
            else -> {}
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
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = { Text("Chỉnh sửa hồ sơ", color = Color.White, fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                )
            },
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(16.dp))

                when (uiState) {
                    is EditProfileUiState.Loading -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = QuizletBlue)
                        }
                    }
                    is EditProfileUiState.Success, is EditProfileUiState.Saving -> {
                        val user = cachedUser

                        // Circular Avatar Preview
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(CircleShape)
                                .border(2.dp, Color.White.copy(alpha = 0.15f), CircleShape)
                                .background(IconBg)
                                .clickable(enabled = !isUploading) {
                                    imagePickerLauncher.launch("image/*")
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            val avatarUrl = avatar.ifBlank { user?.avatar }
                            val email = user?.email ?: "User"
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
                                contentDescription = "Avatar Preview",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )

                            // Semi-translucent overlay with Camera or Spinner
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.35f)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isUploading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(28.dp),
                                        color = QuizletBlue,
                                        strokeWidth = 3.dp
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.CameraAlt,
                                        contentDescription = "Upload Avatar",
                                        tint = Color.White,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Text Button to trigger Gallery selection
                        TextButton(
                            onClick = { imagePickerLauncher.launch("image/*") },
                            enabled = !isUploading,
                            colors = ButtonDefaults.textButtonColors(contentColor = QuizletBlue)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Image,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Chọn ảnh từ điện thoại",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(28.dp))

                        // Username Field
                        OutlinedTextField(
                            value = username,
                            onValueChange = { viewModel.updateUsername(it) },
                            label = { Text("Tên người dùng") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TextGray) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = QuizletBlue,
                                unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                                focusedLabelColor = QuizletBlue,
                                unfocusedLabelColor = TextGray
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Static Metadata badges
                        user?.let { u ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = CardBg)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Vai trò tài khoản", color = TextGray, fontSize = 14.sp)
                                        Text(
                                            text = u.role.replaceFirstChar { it.uppercase() },
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                    Spacer(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(1.dp)
                                            .background(Color.White.copy(alpha = 0.05f))
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Plan", color = TextGray, fontSize = 14.sp)
                                        Text(
                                            text = u.premium.replaceFirstChar { it.uppercase() },
                                            color = IconCyan,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(36.dp))

                        // Save Button
                        val isSaving = uiState is EditProfileUiState.Saving
                        Button(
                            onClick = { viewModel.saveProfile() },
                            enabled = !isSaving && username.isNotBlank(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(50.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = QuizletBlue,
                                disabledContainerColor = QuizletBlue.copy(alpha = 0.5f)
                            )
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.5.dp
                                )
                            } else {
                                Text("Lưu thay đổi", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                    is EditProfileUiState.Error -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(300.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.WifiOff,
                                    contentDescription = null,
                                    modifier = Modifier.size(54.dp),
                                    tint = TextGray
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = (uiState as EditProfileUiState.Error).message,
                                    color = Color.White,
                                    fontSize = 16.sp,
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
                    is EditProfileUiState.SaveSuccess -> {
                        // Handled by LaunchedEffect
                    }
                }
            }
        }
    }
}
