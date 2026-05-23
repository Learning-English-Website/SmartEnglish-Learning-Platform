package com.example.smartenglish.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Primary colors - Indigo/Cobalt
val Primary = Color(0xFF6366F1)
val PrimaryDark = Color(0xFF818CF8)
val PrimaryLight = Color(0xFF4F46E5)

// Surface colors
val Surface = Color(0xFFF8F9FA)
val SurfaceDark = Color(0xFF1A1A2E)
val Background = Color(0xFFFFFFFF)
val BackgroundDark = Color(0xFF0F0F1A)

// Text colors
val OnPrimary = Color(0xFFFFFFFF)
val OnBackground = Color(0xFF1C1B1F)
val OnBackgroundDark = Color(0xFFE0E0E0)
val TextMuted = Color(0xFF6B7280)
val TextMutedDark = Color(0xFF9CA3AF)

// Error/Success colors
val Error = Color(0xFFDC2626)
val Success = Color(0xFF16A34A)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryDark,
    onPrimary = OnPrimary,
    primaryContainer = Primary,
    secondary = Primary,
    tertiary = PrimaryDark,
    background = BackgroundDark,
    surface = SurfaceDark,
    onBackground = OnBackgroundDark,
    onSurface = OnBackgroundDark,
    error = Error
)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    primaryContainer = PrimaryLight,
    secondary = PrimaryDark,
    tertiary = PrimaryLight,
    background = Background,
    surface = Surface,
    onBackground = OnBackground,
    onSurface = OnBackground,
    error = Error
)

@Composable
fun SmartEnglishTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}