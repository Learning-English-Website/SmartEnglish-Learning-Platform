package com.example.smartenglish.presentation.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.smartenglish.domain.model.Achievement
import com.example.smartenglish.domain.model.SessionCompleteResult
import kotlinx.coroutines.delay

private val QuizletBlue   = Color(0xFF4255FF)
private val QuizletGreen  = Color(0xFF00C853)
private val QuizletGold   = Color(0xFFFFD700)
private val QuizletCoral  = Color(0xFFFF6B6B)

// ═══════════════════════════════════════════════════════════════════════════
// XP TOAST — "+130 XP" bay lên rồi mờ dần sau 2.5s
// ═══════════════════════════════════════════════════════════════════════════
@Composable
fun XpGainedToast(xpGained: Int, modifier: Modifier = Modifier) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(xpGained) {
        visible = true
        delay(2500)
        visible = false
    }

    val offsetY by animateFloatAsState(
        targetValue = if (visible) -60f else 0f,
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "xpOffset"
    )
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(400),
        label = "xpAlpha"
    )

    if (xpGained > 0) {
        Box(
            modifier = modifier
                .graphicsLayer {
                    translationY = offsetY
                    this.alpha = alpha
                }
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(QuizletBlue, Color(0xFF7B5CF6))
                    )
                )
                .padding(horizontal = 20.dp, vertical = 10.dp)
        ) {
            Text(
                text = "+$xpGained XP ⚡",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LEVEL UP DIALOG — Dialog toàn màn hình khi level up
// ═══════════════════════════════════════════════════════════════════════════
@Composable
fun LevelUpDialog(
    newLevel: Int,
    xpGained: Int,
    onDismiss: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "levelUp")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            tween(800, easing = FastOutSlowInEasing),
            RepeatMode.Reverse
        ),
        label = "scale"
    )

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF1A1A2E), Color(0xFF4255FF))
                    )
                )
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Emoji nhảy nhảy
                Text(
                    text = "🎉",
                    fontSize = 64.sp,
                    modifier = Modifier.graphicsLayer { scaleX = scale; scaleY = scale }
                )

                Text(
                    text = "LEVEL UP!",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = QuizletGold,
                    letterSpacing = 3.sp
                )

                Text(
                    text = "Level $newLevel",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Text(
                    text = "+$xpGained XP earned",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.8f)
                )

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletGold),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "Tuyệt vời! 🚀",
                        color = Color(0xFF1A1A2E),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT TOAST — Snackbar-style cho từng achievement mới
// ═══════════════════════════════════════════════════════════════════════════
@Composable
fun AchievementUnlockToast(
    achievement: Achievement,
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit
) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(achievement.key) {
        visible = true
        delay(3500)
        visible = false
        delay(300)
        onDismiss()
    }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(16.dp))
                .shadow(8.dp, RoundedCornerShape(16.dp))
                .background(Color(0xFF1E1E2E))
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Emoji trong circle
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(QuizletBlue.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Text(achievement.emoji, fontSize = 24.sp)
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "🏆 Huy hiệu mới!",
                    fontSize = 11.sp,
                    color = QuizletGold,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = achievement.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = achievement.description,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }

            // XP reward badge
            if (achievement.xpReward > 0) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(QuizletGreen.copy(alpha = 0.2f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "+${achievement.xpReward}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = QuizletGreen
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAMIFICATION OVERLAY — Orchestrator: hiện tất cả phần thưởng theo thứ tự
// ═══════════════════════════════════════════════════════════════════════════
@Composable
fun GamificationOverlay(
    result: SessionCompleteResult?,
    onDismiss: () -> Unit
) {
    if (result == null || !result.hasRewards) return

    val xp = result.xp
    var showLevelUpDialog by remember(result) { mutableStateOf(xp?.levelUp == true) }
    var achievementIndex by remember(result) { mutableIntStateOf(0) }
    var showAchievements by remember(result) { mutableStateOf(result.newAchievements.isNotEmpty()) }

    // Auto-dismiss sau khi hết tất cả
    LaunchedEffect(result) {
        // Nếu không có level-up và achievements → chỉ show XP toast rồi dismiss
        if (xp?.levelUp != true && result.newAchievements.isEmpty()) {
            delay(3000)
            onDismiss()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // XP Toast — luôn hiển thị ở giữa trên
        if ((xp?.gained ?: 0) > 0) {
            XpGainedToast(
                xpGained = xp!!.gained,
                modifier = Modifier
                    .align(Alignment.Center)
                    .offset(y = (-40).dp)
            )
        }

        // Achievement toasts — hiện ở bottom, lần lượt
        if (showAchievements && achievementIndex < result.newAchievements.size) {
            AchievementUnlockToast(
                achievement = result.newAchievements[achievementIndex],
                modifier = Modifier.align(Alignment.BottomCenter),
                onDismiss = {
                    if (achievementIndex < result.newAchievements.size - 1) {
                        achievementIndex++
                    } else {
                        showAchievements = false
                        if (xp?.levelUp != true) onDismiss()
                    }
                }
            )
        }
    }

    // Level-up dialog — hiện sau khi XP toast xuất hiện
    if (showLevelUpDialog && xp != null) {
        LaunchedEffect(Unit) { delay(800) }
        LevelUpDialog(
            newLevel = xp.newLevel,
            xpGained = xp.gained,
            onDismiss = {
                showLevelUpDialog = false
                if (!showAchievements) onDismiss()
            }
        )
    }
}
