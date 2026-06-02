package com.example.smartenglish.presentation.cards

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
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
    val isDark = true

    // Dynamic colors based on system theme
    val bgColor1 = if (isDark) DeepDarkNavy else Color(0xFFF8FAFC)
    val bgColor2 = if (isDark) DarkBackground else Color(0xFFF1F5F9)
    val textColorPrimary = if (isDark) Color.White else Color(0xFF0F172A)
    val cardBgStart = if (isDark) CardBg.copy(alpha = 0.7f) else Color.White
    val cardBgEnd = if (isDark) CardBg.copy(alpha = 0.4f) else Color.White
    val cardBorderStart = if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.05f)
    val cardBorderEnd = if (isDark) Color.White.copy(alpha = 0.02f) else Color.Black.copy(alpha = 0.02f)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(bgColor1, bgColor2)
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
                            color = textColorPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = textColorPrimary
                            )
                        }
                    },
                    actions = {
                        val isFormValid = state.card?.front?.isNotBlank() == true && state.card?.back?.isNotBlank() == true
                        Button(
                            onClick = { viewModel.onEvent(CardEditorEvent.Save) },
                            enabled = !state.isSaving && isFormValid,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = QuizletBlue,
                                contentColor = Color.White,
                                disabledContainerColor = QuizletBlue.copy(alpha = 0.2f),
                                disabledContentColor = Color.White.copy(alpha = 0.3f)
                            ),
                            shape = RoundedCornerShape(20.dp),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                            modifier = Modifier.padding(end = 8.dp)
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
                                    fontSize = 14.sp
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = textColorPrimary,
                        navigationIconContentColor = textColorPrimary,
                        actionIconContentColor = textColorPrimary
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
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(24.dp)
                    ) {
                        // ── Bắt buộc ──────────────────────────────────────────
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    brush = Brush.verticalGradient(
                                        colors = listOf(cardBgStart, cardBgEnd)
                                    ),
                                    shape = RoundedCornerShape(24.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    brush = Brush.linearGradient(
                                        colors = listOf(cardBorderStart, cardBorderEnd)
                                    ),
                                    shape = RoundedCornerShape(24.dp)
                                )
                                .padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            SectionHeader(
                                title = "THUẬT NGỮ CHÍNH",
                                subtitle = "Cung cấp thuật ngữ tiếng Anh và định nghĩa tương ứng",
                                indicatorColor = IconCyan
                            )

                            // Term + nút ⚡ Auto-fill
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                PremiumTextField(
                                    value = state.card?.front ?: "",
                                    onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateFront(it)) },
                                    label = "Thuật ngữ (Tiếng Anh) *",
                                    placeholder = "Nhập từ tiếng Anh...",
                                    leadingIcon = Icons.Default.School,
                                    modifier = Modifier.weight(1f),
                                    singleLine = true
                                )

                                // ⚡ Auto-fill button
                                val isAutoFillEnabled = (state.card?.front?.isNotBlank() == true) && !state.isAutoFilling
                                IconButton(
                                    onClick = { viewModel.onEvent(CardEditorEvent.AutoFill) },
                                    enabled = isAutoFillEnabled,
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(
                                            brush = if (isAutoFillEnabled) {
                                                Brush.linearGradient(listOf(QuizletBlue, IconCyan))
                                            } else {
                                                if (isDark) {
                                                    Brush.linearGradient(listOf(Color.White.copy(alpha = 0.04f), Color.White.copy(alpha = 0.04f)))
                                                } else {
                                                    Brush.linearGradient(listOf(Color.Black.copy(alpha = 0.04f), Color.Black.copy(alpha = 0.04f)))
                                                }
                                            },
                                            shape = RoundedCornerShape(16.dp)
                                        )
                                        .border(
                                            width = 1.dp,
                                            brush = if (isAutoFillEnabled) {
                                                Brush.linearGradient(listOf(Color.White.copy(alpha = 0.2f), Color.Transparent))
                                            } else {
                                                if (isDark) {
                                                    Brush.linearGradient(listOf(Color.White.copy(alpha = 0.05f), Color.White.copy(alpha = 0.05f)))
                                                } else {
                                                    Brush.linearGradient(listOf(Color.Black.copy(alpha = 0.05f), Color.Black.copy(alpha = 0.05f)))
                                                }
                                            },
                                            shape = RoundedCornerShape(16.dp)
                                        )
                                ) {
                                    if (state.isAutoFilling) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            strokeWidth = 2.dp,
                                            color = if (isDark) Color.White else QuizletBlue
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.AutoAwesome,
                                            contentDescription = "Auto-fill fields",
                                            tint = if (isAutoFillEnabled) Color.White else (if (isDark) TextWhite.copy(alpha = 0.2f) else Color.Black.copy(alpha = 0.2f)),
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                }
                            }

                            PremiumTextField(
                                value = state.card?.back ?: "",
                                onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateBack(it)) },
                                label = "Định nghĩa (Tiếng Việt) *",
                                placeholder = "Nhập nghĩa tiếng Việt...",
                                leadingIcon = Icons.Default.Translate,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        // ── Tuỳ chọn ──────────────────────────────────────────
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    brush = Brush.verticalGradient(
                                        colors = listOf(cardBgStart, cardBgEnd)
                                    ),
                                    shape = RoundedCornerShape(24.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    brush = Brush.linearGradient(
                                        colors = listOf(cardBorderStart, cardBorderEnd)
                                    ),
                                    shape = RoundedCornerShape(24.dp)
                                )
                                .padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            SectionHeader(
                                title = "CHI TIẾT MỞ RỘNG",
                                subtitle = "Bổ sung thông tin giúp tối ưu khả năng học tập",
                                indicatorColor = QuizletBlue
                            )

                            PremiumTextField(
                                value = state.card?.pronunciation ?: "",
                                onValueChange = { viewModel.onEvent(CardEditorEvent.UpdatePronunciation(it.ifBlank { null })) },
                                label = "Phiên âm",
                                placeholder = "/prəˌnʌnsiˈeɪʃən/",
                                leadingIcon = Icons.Default.RecordVoiceOver,
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            PremiumTextField(
                                value = state.card?.example ?: "",
                                onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateExample(it.ifBlank { null })) },
                                label = "Câu ví dụ",
                                placeholder = "e.g. She made a decision quickly.",
                                leadingIcon = Icons.Default.Translate,
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2,
                                maxLines = 4
                            )

                            PremiumTextField(
                                value = state.card?.collocation ?: "",
                                onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateCollocation(it.ifBlank { null })) },
                                label = "Cụm từ đi kèm (Collocation)",
                                placeholder = "e.g. make a decision, take a photo",
                                leadingIcon = Icons.Default.Book,
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            PremiumTextField(
                                value = state.card?.relatedWords ?: "",
                                onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateRelatedWords(it.ifBlank { null })) },
                                label = "Từ liên quan / Đồng nghĩa",
                                placeholder = "e.g. quick, fast, rapid",
                                leadingIcon = Icons.Default.Link,
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            PremiumTextField(
                                value = state.card?.note ?: "",
                                onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateNote(it.ifBlank { null })) },
                                label = "Ghi chú cá nhân",
                                placeholder = "Mẹo ghi nhớ hoặc ghi chú của riêng bạn...",
                                leadingIcon = Icons.AutoMirrored.Filled.Assignment,
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2,
                                maxLines = 4
                            )
                        }

                        state.error?.let {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, QuizletCoral.copy(alpha = 0.3f), RoundedCornerShape(16.dp)),
                                colors = CardDefaults.cardColors(containerColor = QuizletCoral.copy(alpha = 0.1f)),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = "Error",
                                        tint = QuizletCoral,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Text(
                                        text = it,
                                        color = QuizletCoral,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(50.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun SectionHeader(
    title: String,
    subtitle: String,
    indicatorColor: Color = IconCyan
) {
    val isDark = true
    val textColorPrimary = if (isDark) Color.White else Color(0xFF0F172A)
    val textColorSecondary = if (isDark) TextGray else Color(0xFF475569)

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(28.dp)
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(indicatorColor, indicatorColor.copy(alpha = 0.3f))
                    ),
                    shape = RoundedCornerShape(2.dp)
                )
        )
        Column {
            Text(
                text = title,
                color = textColorPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                color = textColorSecondary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Normal
            )
        }
    }
}

@Composable
fun PremiumTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    singleLine: Boolean = false,
    minLines: Int = 1,
    maxLines: Int = Int.MAX_VALUE
) {
    val isDark = true
    val textColorPrimary = if (isDark) Color.White else Color(0xFF0F172A)
    val textColorSecondary = if (isDark) TextGray else Color(0xFF475569)
    val inputBgFocused = if (isDark) IconBg.copy(alpha = 0.7f) else Color(0xFFF1F5F9)
    val inputBgUnfocused = if (isDark) IconBg.copy(alpha = 0.3f) else Color(0xFFF8FAFC)
    val inputBorderFocused = QuizletBlue
    val inputBorderUnfocused = if (isDark) Color.White.copy(alpha = 0.08f) else Color.Black.copy(alpha = 0.08f)
    val inputLabelColor = if (isDark) TextWhite.copy(alpha = 0.7f) else Color(0xFF475569)
    val inputPlaceholderColor = if (isDark) TextWhite.copy(alpha = 0.4f) else Color(0xFF94A3B8)
    val iconColor = if (isDark) IconCyan else QuizletBlue

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = inputLabelColor, fontSize = 13.sp) },
        placeholder = { Text(placeholder, color = inputPlaceholderColor, fontSize = 14.sp) },
        modifier = modifier,
        singleLine = singleLine,
        minLines = minLines,
        maxLines = maxLines,
        leadingIcon = {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                tint = iconColor.copy(alpha = 0.8f),
                modifier = Modifier.size(20.dp)
            )
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = textColorPrimary,
            unfocusedTextColor = textColorPrimary,
            focusedLabelColor = iconColor,
            unfocusedLabelColor = textColorSecondary,
            focusedBorderColor = inputBorderFocused,
            unfocusedBorderColor = inputBorderUnfocused,
            cursorColor = QuizletBlue,
            focusedContainerColor = inputBgFocused,
            unfocusedContainerColor = inputBgUnfocused
        ),
        shape = RoundedCornerShape(16.dp)
    )
}

