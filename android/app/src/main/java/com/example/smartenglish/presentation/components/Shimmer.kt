package com.example.smartenglish.presentation.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val ShimmerColors = listOf(
    Color(0xFFE0E0E0),
    Color(0xFFF5F5F5),
    Color(0xFFE0E0E0)
)

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    widthFraction: Float = 1f,
    height: Int = 16
) {
    val shimmerColors = ShimmerColors
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )
    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnim - 500f, translateAnim - 500f),
        end = Offset(translateAnim, translateAnim)
    )

    Box(
        modifier = modifier
            .fillMaxWidth(widthFraction)
            .height(height.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(brush)
    )
}

@Composable
fun ShimmerCard(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF0F0F0))
            .padding(12.dp)
    ) {
        ShimmerBox(height = 12, widthFraction = 0.5f)
        Spacer(Modifier.height(8.dp))
        ShimmerBox(height = 18, widthFraction = 0.9f)
        Spacer(Modifier.height(6.dp))
        ShimmerBox(height = 18, widthFraction = 0.7f)
        Spacer(Modifier.height(12.dp))
        ShimmerBox(height = 14, widthFraction = 0.3f)
    }
}

@Composable
fun ShimmerGrid(
    columns: Int = 2,
    itemCount: Int = 6,
    modifier: Modifier = Modifier
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
                            modifier = Modifier.weight(1f)
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
