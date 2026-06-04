package com.example.smartenglish.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.smartenglish.MainActivity
import com.example.smartenglish.data.local.preferences.ReminderPreferences
import com.example.smartenglish.util.StudyReminderHelper

class StudyReminderReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "StudyReminderReceiver"
        private const val CHANNEL_ID = "daily_study_reminder_channel"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "onReceive: Action received = $action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            // Reschedule alarm on system boot or package update
            val reminderPrefs = ReminderPreferences(context)
            if (reminderPrefs.isReminderEnabled()) {
                Log.d(TAG, "onReceive: System boot/update - rescheduling study alarm")
                StudyReminderHelper.scheduleReminder(context)
            }
        } else {
            // Alarm trigger event
            Log.d(TAG, "onReceive: Alarm triggered!")
            val reminderPrefs = ReminderPreferences(context)
            if (reminderPrefs.isReminderEnabled()) {
                showNotification(context)
                // Automatically schedule for the next day
                StudyReminderHelper.scheduleReminder(context)
            }
        }
    }

    private fun showNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Daily Study Reminder"
            val descriptionText = "Nhắc nhở học tiếng Anh hằng ngày cùng Memoris"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Open MainActivity when clicked
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Select random reminder content for better UX
        val titles = listOf(
            "📚 Giờ học tiếng Anh tới rồi!",
            "🔥 Đừng để đứt chuỗi học tập!",
            "⚡ Ôn tập từ vựng mỗi ngày",
            "🌟 Duy trì thói quen học tập cùng Memoris!"
        )
        val messages = listOf(
            "Chỉ mất 5 phút ôn tập hôm nay để nhớ từ vựng lâu hơn. Vào học ngay thôi!",
            "Hôm nay bạn đã ôn tập chưa? Hãy vào học để giữ vững chuỗi streak nhé!",
            "Mỗi ngày học một chút, kiến thức sẽ dày thêm. Vào học ngay thôi!",
            "Rèn luyện đều đặn là chìa khóa ghi nhớ lâu. Mở ứng dụng học ngay nhé!"
        )

        val index = (Math.random() * titles.size).toInt()
        val title = titles[index]
        val message = messages[index]

        // Try to get logo drawable, fallback to app icon
        val smallIcon = try {
            com.example.smartenglish.R.drawable.logo_app
        } catch (_: Exception) {
            context.applicationInfo.icon
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        try {
            notificationManager.notify(NOTIFICATION_ID, builder.build())
            Log.d(TAG, "showNotification: Daily study reminder notification shown.")
        } catch (e: Exception) {
            Log.e(TAG, "showNotification: Error showing notification: ${e.message}", e)
        }
    }
}
