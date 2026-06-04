package com.example.smartenglish.presentation.auth

import android.app.Activity
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.hilt.navigation.compose.hiltViewModel

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconCyan = Color(0xFF38BDF8)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResetPasswordScreen(
    email: String,
    otp: String,
    onNavigateBack: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            val insetsController = WindowCompat.getInsetsController(window, view)
            insetsController.isAppearanceLightStatusBars = false
            insetsController.isAppearanceLightNavigationBars = false
        }
    }

    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        viewModel.setPendingEmail(email)
    }

    LaunchedEffect(uiState) {
        when (uiState) {
            is AuthUiState.ForgotPasswordSuccess -> {
                android.widget.Toast.makeText(context, (uiState as AuthUiState.ForgotPasswordSuccess).message, android.widget.Toast.LENGTH_SHORT).show()
                viewModel.resetState()
                onNavigateToLogin()
            }
            is AuthUiState.Error -> {
                snackbarHostState.showSnackbar((uiState as AuthUiState.Error).message)
            }
            else -> {}
        }
    }

    Scaffold(
        containerColor = Color.Transparent,
        topBar = {
            TopAppBar(
                title = { Text("Mật Khẩu Mới", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier.fillMaxSize()
        ) {
            // Premium Starry Night Background Image
            Image(
                painter = painterResource(id = com.example.smartenglish.R.drawable.bg_starry_night),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Top
            ) {
                Spacer(modifier = Modifier.height(56.dp))

                // Translucent glassmorphic card container
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0D102C).copy(alpha = 0.65f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Lock emoji with cyan glow effect
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(80.dp)
                                .background(Color(0xFF1E214A).copy(alpha = 0.6f), CircleShape)
                                .border(1.dp, IconCyan.copy(alpha = 0.3f), CircleShape)
                        ) {
                            Text(
                                text = "🔒",
                                fontSize = 38.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Text(
                            text = "Đặt Mật Khẩu Mới",
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 24.sp,
                            letterSpacing = 0.1.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Tạo mật khẩu mới và bảo mật hơn cho tài khoản của bạn.",
                            fontSize = 14.sp,
                            color = TextGray,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        // New Password field
                        OutlinedTextField(
                            value = newPassword,
                            onValueChange = {
                                newPassword = it
                                passwordError = null
                            },
                            label = { Text("Mật khẩu mới", fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextGray, modifier = Modifier.size(20.dp)) },
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = if (passwordVisible) "Ẩn mật khẩu" else "Hiện mật khẩu",
                                        tint = TextGray,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            },
                            isError = passwordError != null,
                            supportingText = passwordError?.let { { Text(it, color = QuizletCoral, fontSize = 11.sp) } },
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Next
                            ),
                            keyboardActions = KeyboardActions(
                                onNext = { focusManager.moveFocus(FocusDirection.Down) }
                            ),
                            singleLine = true,
                            enabled = uiState !is AuthUiState.Loading,
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = QuizletBlue,
                                unfocusedBorderColor = Color.White.copy(alpha = 0.08f),
                                focusedLabelColor = QuizletBlue,
                                unfocusedLabelColor = TextGray,
                                focusedContainerColor = Color(0xFF0F112A).copy(alpha = 0.6f),
                                unfocusedContainerColor = Color(0xFF0F112A).copy(alpha = 0.6f)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Confirm Password field
                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = {
                                confirmPassword = it
                                confirmPasswordError = null
                            },
                            label = { Text("Xác nhận mật khẩu mới", fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextGray, modifier = Modifier.size(20.dp)) },
                            isError = confirmPasswordError != null,
                            supportingText = confirmPasswordError?.let { { Text(it, color = QuizletCoral, fontSize = 11.sp) } },
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    focusManager.clearFocus()
                                    if (validateForm(newPassword, confirmPassword, { passwordError = it }, { confirmPasswordError = it })) {
                                        viewModel.resetPassword(otp, newPassword, confirmPassword)
                                    }
                                }
                            ),
                            singleLine = true,
                            enabled = uiState !is AuthUiState.Loading,
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = QuizletBlue,
                                unfocusedBorderColor = Color.White.copy(alpha = 0.08f),
                                focusedLabelColor = QuizletBlue,
                                unfocusedLabelColor = TextGray,
                                focusedContainerColor = Color(0xFF0F112A).copy(alpha = 0.6f),
                                unfocusedContainerColor = Color(0xFF0F112A).copy(alpha = 0.6f)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Reset Button
                        Button(
                            onClick = {
                                focusManager.clearFocus()
                                if (validateForm(newPassword, confirmPassword, { passwordError = it }, { confirmPasswordError = it })) {
                                    viewModel.resetPassword(otp, newPassword, confirmPassword)
                                }
                            },
                            enabled = uiState !is AuthUiState.Loading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = listOf(Color(0xFF2563EB), Color(0xFF7C3AED))
                                    ),
                                    shape = RoundedCornerShape(16.dp)
                                ),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Transparent,
                                disabledContainerColor = Color.Transparent
                            ),
                            contentPadding = PaddingValues(),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            if (uiState is AuthUiState.Loading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Box(
                                    modifier = Modifier.fillMaxWidth(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "Đặt Lại Mật Khẩu",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier
                                            .align(Alignment.CenterEnd)
                                            .padding(end = 16.dp)
                                            .size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

private fun validateForm(
    newPassword: String,
    confirmPassword: String,
    setPasswordError: (String?) -> Unit,
    setConfirmPasswordError: (String?) -> Unit
): Boolean {
    var isValid = true

    if (newPassword.isBlank()) {
        setPasswordError("Vui lòng nhập mật khẩu mới")
        isValid = false
    } else if (newPassword.length < 8) {
        setPasswordError("Mật khẩu phải tối thiểu 8 ký tự")
        isValid = false
    } else if (!newPassword.any { it.isUpperCase() }) {
        setPasswordError("Mật khẩu phải chứa ít nhất 1 chữ hoa")
        isValid = false
    } else if (!newPassword.any { it.isLowerCase() }) {
        setPasswordError("Mật khẩu phải chứa ít nhất 1 chữ thường")
        isValid = false
    } else if (!newPassword.any { it.isDigit() }) {
        setPasswordError("Mật khẩu phải chứa ít nhất 1 chữ số")
        isValid = false
    }

    if (confirmPassword.isBlank()) {
        setConfirmPasswordError("Vui lòng xác nhận mật khẩu mới")
        isValid = false
    } else if (newPassword != confirmPassword) {
        setConfirmPasswordError("Mật khẩu xác nhận không khớp")
        isValid = false
    }

    return isValid
}
