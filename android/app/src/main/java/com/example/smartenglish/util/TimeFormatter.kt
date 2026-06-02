package com.example.smartenglish.util

import java.util.concurrent.TimeUnit

object TimeFormatter {
    fun formatRelativeTime(timestamp: Long, currentTime: Long = System.currentTimeMillis()): String {
        if (timestamp <= 0) return "Chưa đồng bộ"
        val diff = currentTime - timestamp
        if (diff < 0) return "vừa xong"
        
        val diffSeconds = TimeUnit.MILLISECONDS.toSeconds(diff)
        val diffMinutes = TimeUnit.MILLISECONDS.toMinutes(diff)
        val diffHours = TimeUnit.MILLISECONDS.toHours(diff)
        val diffDays = TimeUnit.MILLISECONDS.toDays(diff)
        
        return when {
            diffSeconds < 60 -> "vừa xong"
            diffMinutes < 60 -> "$diffMinutes phút trước"
            diffHours < 24 -> "$diffHours giờ trước"
            else -> "$diffDays ngày trước"
        }
    }
}
