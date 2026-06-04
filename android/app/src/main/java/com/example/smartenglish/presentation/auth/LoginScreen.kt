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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Style
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.toArgb
import androidx.compose.runtime.SideEffect
import androidx.core.view.WindowCompat
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.ContentScale
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts

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
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    onLoginSuccess: (com.example.smartenglish.domain.model.User) -> Unit,
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

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        viewModel.handleGoogleSignInResult(task)
    }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is AuthUiState.Success -> {
                onLoginSuccess(state.user)
                viewModel.resetState()
            }
            is AuthUiState.Error -> {
                snackbarHostState.showSnackbar(state.message)
            }
            else -> {}
        }
    }

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
                        .size(80.dp)
                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
                        .background(Color.Transparent, shape = RoundedCornerShape(20.dp))
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Brand Title "Memoris"
                Text(
                    text = "Memoris",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 38.sp,
                    letterSpacing = 0.2.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Slogan
                Text(
                    text = "Học tập thông minh hơn mỗi ngày",
                    fontSize = 14.sp,
                    color = TextGray,
                    fontWeight = FontWeight.Normal
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Premium borderless translucent glass card
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
                        // Google Sign-In Button
                        OutlinedButton(
                            onClick = {
                                val activity = context as? Activity ?: return@OutlinedButton
                                val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                    .requestIdToken("297795853428-vumtqd1otn7dvjqg260rr63mb3p7dbup.apps.googleusercontent.com")
                                    .requestEmail()
                                    .build()
                                val client = GoogleSignIn.getClient(activity, gso)
                                client.signOut().addOnCompleteListener {
                                    googleSignInLauncher.launch(client.signInIntent)
                                }
                            },
                            enabled = uiState !is AuthUiState.Loading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
                            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White.copy(alpha = 0.04f))
                        ) {
                            if (uiState is AuthUiState.Loading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = QuizletBlue,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    // Multicolor Google G Icon
                                    Icon(
                                        painter = painterResource(id = com.example.smartenglish.R.drawable.ic_google),
                                        contentDescription = "Google Icon",
                                        tint = Color.Unspecified,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Text(
                                        text = "Đăng nhập với Google",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Styled Horizontal Divider
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.White.copy(alpha = 0.06f))
                            Text(
                                text = "hoặc",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextGray.copy(alpha = 0.5f),
                                fontSize = 12.sp
                            )
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.White.copy(alpha = 0.06f))
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Email Field
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

                        Spacer(modifier = Modifier.height(12.dp))

                        // Password Field
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
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    focusManager.clearFocus()
                                    if (validateLogin(email, password, { emailError = it }, { passwordError = it })) {
                                        viewModel.login(email, password)
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

                        Spacer(modifier = Modifier.height(4.dp))

                        // Forgot Password Link
                        TextButton(
                            onClick = onNavigateToForgotPassword,
                            modifier = Modifier.align(Alignment.End),
                            enabled = uiState !is AuthUiState.Loading,
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Text("Quên mật khẩu?", color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Premium Sign In Button with Gradient & Centered text & Right aligned Arrow icon
                        Button(
                            onClick = {
                                focusManager.clearFocus()
                                if (validateLogin(email, password, { emailError = it }, { passwordError = it })) {
                                    viewModel.login(email, password)
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
                                        text = "Đăng Nhập",
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

                Spacer(modifier = Modifier.height(24.dp))

                // Styled Register Prompt Link
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Chưa có tài khoản? ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextGray,
                        fontSize = 14.sp
                    )
                    TextButton(
                        onClick = onNavigateToRegister,
                        contentPadding = PaddingValues(0.dp),
                        enabled = uiState !is AuthUiState.Loading
                    ) {
                        Text("Tạo tài khoản miễn phí", color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

private fun validateLogin(
    email: String,
    password: String,
    setEmailError: (String?) -> Unit,
    setPasswordError: (String?) -> Unit
): Boolean {
    var isValid = true

    if (email.isBlank()) {
        setEmailError("Vui lòng nhập Email")
        isValid = false
    } else if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
        setEmailError("Email sai định dạng")
        isValid = false
    }

    if (password.isBlank()) {
        setPasswordError("Vui lòng nhập mật khẩu")
        isValid = false
    }

    return isValid
}
