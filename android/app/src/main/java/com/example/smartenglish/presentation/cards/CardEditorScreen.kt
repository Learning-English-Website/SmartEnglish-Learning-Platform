package com.example.smartenglish.presentation.cards

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)
private val QuizletCoral = Color(0xFFFF6B6B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CardEditorScreen(
    onNavigateBack: () -> Unit,
    viewModel: CardEditorViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) {
            onNavigateBack()
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
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            text = if (state.isNewCard) "Thêm thuật ngữ" else "Sửa thuật ngữ",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White
                            )
                        }
                    },
                    actions = {
                        val isFormValid = state.card?.front?.isNotBlank() == true && state.card?.back?.isNotBlank() == true
                        TextButton(
                            onClick = { viewModel.onEvent(CardEditorEvent.Save) },
                            enabled = !state.isSaving && isFormValid,
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = Color.White,
                                disabledContentColor = Color.White.copy(alpha = 0.3f)
                            )
                        ) {
                            if (state.isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp,
                                    color = Color.White
                                )
                            } else {
                                Text(
                                    text = "Lưu",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = if (isFormValid) Color.White else Color.White.copy(alpha = 0.3f)
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White,
                        actionIconContentColor = Color.White
                    )
                )
            }
        ) { paddingValues ->
            when {
                state.isLoading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = QuizletBlue)
                    }
                }
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // ── Bắt buộc ──────────────────────────────────────────
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp)),
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = CardBg.copy(alpha = 0.65f))
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Text(
                                    text = "THUẬT NGỮ CHÍNH (BẮT BUỘC)",
                                    color = IconCyan,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )

                                // Term + nút ⚡ Auto-fill
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    OutlinedTextField(
                                        value = state.card?.front ?: "",
                                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateFront(it)) },
                                        label = { Text("Thuật ngữ (Tiếng Anh) *", color = TextWhite.copy(alpha = 0.7f)) },
                                        placeholder = { Text("Nhập từ tiếng Anh...", color = TextWhite.copy(alpha = 0.4f)) },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White,
                                            unfocusedTextColor = Color.White,
                                            focusedLabelColor = IconCyan,
                                            unfocusedLabelColor = TextGray,
                                            focusedBorderColor = QuizletBlue,
                                            unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                            cursorColor = QuizletBlue,
                                            focusedContainerColor = IconBg,
                                            unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    // ⚡ Auto-fill button
                                    val isAutoFillEnabled = (state.card?.front?.isNotBlank() == true) && !state.isAutoFilling
                                    IconButton(
                                        onClick = { viewModel.onEvent(CardEditorEvent.AutoFill) },
                                        enabled = isAutoFillEnabled,
                                        modifier = Modifier
                                            .size(52.dp)
                                            .background(
                                                brush = Brush.horizontalGradient(
                                                    colors = if (isAutoFillEnabled) {
                                                        listOf(QuizletBlue, Color(0xFF6B7BFF))
                                                    } else {
                                                        listOf(Color.White.copy(alpha = 0.08f), Color.White.copy(alpha = 0.08f))
                                                    }
                                                ),
                                                shape = RoundedCornerShape(12.dp)
                                            )
                                    ) {
                                        if (state.isAutoFilling) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = Color.White
                                            )
                                        } else {
                                            Icon(
                                                imageVector = Icons.Default.AutoAwesome,
                                                contentDescription = "Auto-fill fields",
                                                tint = if (isAutoFillEnabled) Color.White else TextWhite.copy(alpha = 0.3f),
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                }

                                OutlinedTextField(
                                    value = state.card?.back ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateBack(it)) },
                                    label = { Text("Định nghĩa (Tiếng Việt) *", color = TextWhite.copy(alpha = 0.7f)) },
                                    placeholder = { Text("Nhập nghĩa tiếng Việt...", color = TextWhite.copy(alpha = 0.4f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedLabelColor = IconCyan,
                                        unfocusedLabelColor = TextGray,
                                        focusedBorderColor = QuizletBlue,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                        cursorColor = QuizletBlue,
                                        focusedContainerColor = IconBg,
                                        unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }
                        }

                        // ── Tuỳ chọn ──────────────────────────────────────────
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp)),
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = CardBg.copy(alpha = 0.65f))
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Text(
                                    text = "CHI TIẾT MỞ RỘNG (TÙY CHỌN)",
                                    color = IconCyan,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )

                                OutlinedTextField(
                                    value = state.card?.pronunciation ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdatePronunciation(it.ifBlank { null })) },
                                    label = { Text("Phiên âm", color = TextWhite.copy(alpha = 0.7f)) },
                                    placeholder = { Text("/prəˌnʌnsiˈeɪʃən/", color = TextWhite.copy(alpha = 0.4f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.RecordVoiceOver,
                                            contentDescription = null,
                                            tint = IconCyan.copy(alpha = 0.7f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedLabelColor = IconCyan,
                                        unfocusedLabelColor = TextGray,
                                        focusedBorderColor = QuizletBlue,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                        cursorColor = QuizletBlue,
                                        focusedContainerColor = IconBg,
                                        unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                OutlinedTextField(
                                    value = state.card?.example ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateExample(it.ifBlank { null })) },
                                    label = { Text("Câu ví dụ", color = TextWhite.copy(alpha = 0.7f)) },
                                    placeholder = { Text("e.g. She made a decision quickly.", color = TextWhite.copy(alpha = 0.4f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 2,
                                    maxLines = 4,
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Translate,
                                            contentDescription = null,
                                            tint = IconCyan.copy(alpha = 0.7f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedLabelColor = IconCyan,
                                        unfocusedLabelColor = TextGray,
                                        focusedBorderColor = QuizletBlue,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                        cursorColor = QuizletBlue,
                                        focusedContainerColor = IconBg,
                                        unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                OutlinedTextField(
                                    value = state.card?.collocation ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateCollocation(it.ifBlank { null })) },
                                    label = { Text("Cụm từ đi kèm (Collocation)", color = TextWhite.copy(alpha = 0.7f)) },
                                    placeholder = { Text("e.g. make a decision, take a photo", color = TextWhite.copy(alpha = 0.4f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Book,
                                            contentDescription = null,
                                            tint = IconCyan.copy(alpha = 0.7f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedLabelColor = IconCyan,
                                        unfocusedLabelColor = TextGray,
                                        focusedBorderColor = QuizletBlue,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                        cursorColor = QuizletBlue,
                                        focusedContainerColor = IconBg,
                                        unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                OutlinedTextField(
                                    value = state.card?.relatedWords ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateRelatedWords(it.ifBlank { null })) },
                                    label = { Text("Từ liên quan / Đồng nghĩa", color = TextWhite.copy(alpha = 0.7f)) },
                                    placeholder = { Text("e.g. quick, fast, rapid", color = TextWhite.copy(alpha = 0.4f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Link,
                                            contentDescription = null,
                                            tint = IconCyan.copy(alpha = 0.7f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedLabelColor = IconCyan,
                                        unfocusedLabelColor = TextGray,
                                        focusedBorderColor = QuizletBlue,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                        cursorColor = QuizletBlue,
                                        focusedContainerColor = IconBg,
                                        unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                OutlinedTextField(
                                    value = state.card?.note ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateNote(it.ifBlank { null })) },
                                    label = { Text("Ghi chú cá nhân", color = TextWhite.copy(alpha = 0.7f)) },
                                    placeholder = { Text("Ghi chú cá nhân hoặc mẹo ghi nhớ...", color = TextWhite.copy(alpha = 0.4f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 2,
                                    maxLines = 4,
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Assignment,
                                            contentDescription = null,
                                            tint = IconCyan.copy(alpha = 0.7f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedLabelColor = IconCyan,
                                        unfocusedLabelColor = TextGray,
                                        focusedBorderColor = QuizletBlue,
                                        unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                                        cursorColor = QuizletBlue,
                                        focusedContainerColor = IconBg,
                                        unfocusedContainerColor = IconBg.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }
                        }

                        state.error?.let {
                            Text(
                                text = it,
                                color = QuizletCoral,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}
