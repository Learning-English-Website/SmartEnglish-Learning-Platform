package com.example.smartenglish.presentation.auth

import android.app.Activity
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.User

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)

@Composable
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegisterSuccess: (User) -> Unit,
    onNavigateToOtp: (String) -> Unit,
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

    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var usernameError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is AuthUiState.Success -> {
                onRegisterSuccess(state.user)
                viewModel.resetState()
            }
            is AuthUiState.EmailVerificationRequired -> {
                val targetEmail = state.email
                // Reset state BEFORE navigating to OTP screen to prevent redirect loop on back press
                viewModel.resetState()
                onNavigateToOtp(targetEmail)
            }
            is AuthUiState.Error -> {
                snackbarHostState.showSnackbar(state.message)
            }
            else -> {}
        }
    }

    val passwordStrength = remember(password) { calculatePasswordStrength(password) }

    Scaffold(
        containerColor = Color.Transparent,
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
                verticalArrangement = Arrangement.Center
            ) {
                Spacer(modifier = Modifier.height(24.dp))

                // Logo App Icon (Clean & Perfectly Sized)
                Image(
                    painter = painterResource(id = com.example.smartenglish.R.drawable.logo_app),
                    contentDescription = "Logo",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(72.dp)
                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(18.dp))
                        .background(Color.Transparent, shape = RoundedCornerShape(18.dp))
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Title
                Text(
                    text = "Tạo Tài Khoản",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 30.sp,
                    letterSpacing = 0.2.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Bắt đầu hành trình học tập hôm nay",
                    fontSize = 14.sp,
                    color = TextGray,
                    fontWeight = FontWeight.Normal
                )

                Spacer(modifier = Modifier.height(20.dp))

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
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Email address field
                        OutlinedTextField(
                            value = email,
                            onValueChange = {
                                email = it
                                emailError = null
                            },
                            label = { Text("Địa chỉ Email", fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = TextGray, modifier = Modifier.size(20.dp)) },
                            isError = emailError != null,
                            supportingText = emailError?.let { { Text(it, color = QuizletCoral, fontSize = 11.sp) } },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
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

                        // Username field
                        OutlinedTextField(
                            value = username,
                            onValueChange = {
                                username = it
                                usernameError = null
                            },
                            label = { Text("Tên đăng nhập (3-30 ký tự)", fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TextGray, modifier = Modifier.size(20.dp)) },
                            isError = usernameError != null,
                            supportingText = usernameError?.let { { Text(it, color = QuizletCoral, fontSize = 11.sp) } },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Text,
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

                        // Password field
                        OutlinedTextField(
                            value = password,
                            onValueChange = {
                                password = it
                                passwordError = null
                            },
                            label = { Text("Mật khẩu", fontSize = 13.sp) },
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
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            isError = passwordError != null,
                            supportingText = passwordError?.let { { Text(it, color = QuizletCoral, fontSize = 11.sp) } },
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

                        // Password strength indicator
                        if (password.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                LinearProgressIndicator(
                                    progress = { passwordStrength / 5f },
                                    modifier = Modifier.weight(1f),
                                    color = getStrengthColor(passwordStrength),
                                    trackColor = Color.White.copy(alpha = 0.08f)
                                )
                                Text(
                                    text = getStrengthLabel(passwordStrength),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = getStrengthColor(passwordStrength),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Confirm password field
                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = {
                                confirmPassword = it
                                confirmError = null
                            },
                            label = { Text("Xác nhận mật khẩu", fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextGray, modifier = Modifier.size(20.dp)) },
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            isError = confirmError != null,
                            supportingText = confirmError?.let { { Text(it, color = QuizletCoral, fontSize = 11.sp) } },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    focusManager.clearFocus()
                                    if (validateRegister(
                                            email, username, password, confirmPassword,
                                            { emailError = it }, { usernameError = it }, { passwordError = it }, { confirmError = it }
                                        )) {
                                        viewModel.register(email, username, password)
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

                        Spacer(modifier = Modifier.height(20.dp))

                        // Premium Register button
                        Button(
                            onClick = {
                                focusManager.clearFocus()
                                if (validateRegister(
                                        email, username, password, confirmPassword,
                                        { emailError = it }, { usernameError = it }, { passwordError = it }, { confirmError = it }
                                    )) {
                                    viewModel.register(email, username, password)
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
                                        text = "Đăng Ký",
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

                Spacer(modifier = Modifier.height(20.dp))

                // Bottom Login prompt
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Đã có tài khoản? ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextGray,
                        fontSize = 14.sp
                    )
                    TextButton(
                        onClick = onNavigateToLogin,
                        contentPadding = PaddingValues(0.dp),
                        enabled = uiState !is AuthUiState.Loading
                    ) {
                        Text("Đăng nhập", color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

private fun validateRegister(
    email: String,
    username: String,
    password: String,
    confirmPassword: String,
    setEmailError: (String?) -> Unit,
    setUsernameError: (String?) -> Unit,
    setPasswordError: (String?) -> Unit,
    setConfirmError: (String?) -> Unit
): Boolean {
    var isValid = true

    if (email.isBlank()) {
        setEmailError("Vui lòng nhập Email")
        isValid = false
    } else if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
        setEmailError("Email sai định dạng")
        isValid = false
    }

    if (username.isBlank()) {
        setUsernameError("Vui lòng nhập Tên đăng nhập")
        isValid = false
    } else if (username.length < 3) {
        setUsernameError("Tên đăng nhập tối thiểu 3 ký tự")
        isValid = false
    } else if (username.length > 30) {
        setUsernameError("Tên đăng nhập tối đa 30 ký tự")
        isValid = false
    } else if (!username.matches(Regex("^[a-zA-Z0-9]+$"))) {
        setUsernameError("Chỉ cho phép nhập chữ cái và số")
        isValid = false
    }

    if (password.isBlank()) {
        setPasswordError("Vui lòng nhập mật khẩu")
        isValid = false
    } else if (!password.matches(Regex("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$"))) {
        setPasswordError("Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số")
        isValid = false
    }

    if (confirmPassword.isBlank()) {
        setConfirmError("Vui lòng xác nhận mật khẩu")
        isValid = false
    } else if (password != confirmPassword) {
        setConfirmError("Mật khẩu xác nhận không khớp")
        isValid = false
    }

    return isValid
}

private fun calculatePasswordStrength(password: String): Int {
    if (password.isEmpty()) return 0
    var strength = 0
    if (password.length >= 8) strength++
    if (password.any { it.isUpperCase() }) strength++
    if (password.any { it.isLowerCase() }) strength++
    if (password.any { it.isDigit() }) strength++
    if (password.any { !it.isLetterOrDigit() }) strength++
    return strength
}

private fun getStrengthLabel(strength: Int): String {
    return when (strength) {
        0 -> ""
        1 -> "Rất yếu"
        2 -> "Yếu"
        3 -> "Trung bình"
        4 -> "Mạnh"
        else -> "Rất mạnh"
    }
}

private fun getStrengthColor(strength: Int): Color {
    return when (strength) {
        0, 1 -> Color(0xFFDC2626) // Red
        2 -> Color(0xFFF97316) // Orange
        3 -> Color(0xFFFBBF24) // Yellow
        4 -> Color(0xFF22C55E) // Green
        else -> Color(0xFF16A34A) // Dark Green
    }
}
