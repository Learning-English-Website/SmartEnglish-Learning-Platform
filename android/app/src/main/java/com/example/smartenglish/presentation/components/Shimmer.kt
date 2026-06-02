package com.example.smartenglish.presentation.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

// Color Palettes
val LightShimmerColors = listOf(
    Color(0xFFE2E8F0),
    Color(0xFFF1F5F9),
    Color(0xFFE2E8F0)
)

val DarkShimmerColors = listOf(
    Color(0xFF1E293B),
    Color(0xFF334155),
    Color(0xFF1E293B)
)

val PremiumNavyShimmerColors = listOf(
    Color(0xFF161A3F),
    Color(0xFF252A60),
    Color(0xFF161A3F)
)

@Composable
fun defaultShimmerColors(): List<Color> {
    return if (isSystemInDarkTheme()) PremiumNavyShimmerColors else LightShimmerColors
}

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    widthFraction: Float = 1f,
    height: Int = 16,
    shape: Shape = RoundedCornerShape(8.dp),
    colors: List<Color> = defaultShimmerColors()
) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )
    val brush = Brush.linearGradient(
        colors = colors,
        start = Offset(translateAnim - 500f, translateAnim - 500f),
        end = Offset(translateAnim, translateAnim)
    )

    Box(
        modifier = modifier
            .fillMaxWidth(widthFraction)
            .height(height.dp)
            .clip(shape)
            .background(brush)
    )
}

@Composable
fun ShimmerCard(
    modifier: Modifier = Modifier,
    colors: List<Color> = defaultShimmerColors(),
    bgColor: Color = if (isSystemInDarkTheme()) Color(0xFF161A3F).copy(alpha = 0.65f) else Color(0xFFF1F5F9)
) {
    val borderColor = if (isSystemInDarkTheme()) Color.White.copy(alpha = 0.08f) else Color.Black.copy(alpha = 0.04f)
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        ShimmerBox(height = 14, widthFraction = 0.4f, colors = colors)
        Spacer(Modifier.height(12.dp))
        ShimmerBox(height = 20, widthFraction = 0.85f, colors = colors)
        Spacer(Modifier.height(8.dp))
        ShimmerBox(height = 14, widthFraction = 0.6f, colors = colors)
        Spacer(Modifier.height(16.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ShimmerBox(modifier = Modifier.size(24.dp), shape = CircleShape, colors = colors)
            ShimmerBox(height = 12, widthFraction = 0.3f, colors = colors)
        }
    }
}

@Composable
fun ShimmerGrid(
    columns: Int = 2,
    itemCount: Int = 6,
    modifier: Modifier = Modifier,
    colors: List<Color> = defaultShimmerColors()
) {
    Column(modifier = modifier) {
        var rows = itemCount / columns
        if (itemCount % columns != 0) rows++
        repeat(rows) { rowIndex ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                repeat(columns) { colIndex ->
                    val index = rowIndex * columns + colIndex
                    if (index < itemCount) {
                        ShimmerCard(
                            modifier = Modifier.weight(1f),
                            colors = colors
                        )
                    } else {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }
            if (rowIndex < rows - 1) {
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

@Composable
fun HomeSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // 1. Header Skeleton
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ShimmerBox(
                modifier = Modifier.weight(1f),
                height = 48,
                shape = RoundedCornerShape(16.dp)
            )
            ShimmerBox(
                modifier = Modifier.size(44.dp),
                shape = CircleShape
            )
        }

        Spacer(modifier = Modifier.height(28.dp))

        // 2. Continue Learning Skeleton Title
        ShimmerBox(height = 18, widthFraction = 0.35f)
        Spacer(modifier = Modifier.height(14.dp))

        // Large Continue Learning Card Skeleton
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(Color(0xFF0D102C).copy(alpha = 0.65f))
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp))
                .padding(24.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                ShimmerBox(height = 12, widthFraction = 0.25f)
                ShimmerBox(modifier = Modifier.size(20.dp), shape = CircleShape)
            }
            Spacer(modifier = Modifier.height(16.dp))
            ShimmerBox(height = 24, widthFraction = 0.7f)
            Spacer(modifier = Modifier.height(8.dp))
            ShimmerBox(height = 14, widthFraction = 0.45f)
            Spacer(modifier = Modifier.height(24.dp))
            // Progress bar and percentage skeleton
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ShimmerBox(
                    modifier = Modifier.weight(1f),
                    height = 8,
                    shape = RoundedCornerShape(4.dp)
                )
                ShimmerBox(height = 12, widthFraction = 0.1f)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // 3. Recent Sets Title
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ShimmerBox(height = 18, widthFraction = 0.4f)
            ShimmerBox(height = 14, widthFraction = 0.15f)
        }
        
        Spacer(modifier = Modifier.height(16.dp))

        // List of recent sets skeletons
        repeat(2) { index ->
            ShimmerCard(modifier = Modifier.fillMaxWidth())
            if (index < 1) {
                Spacer(modifier = Modifier.height(14.dp))
            }
        }
    }
}
