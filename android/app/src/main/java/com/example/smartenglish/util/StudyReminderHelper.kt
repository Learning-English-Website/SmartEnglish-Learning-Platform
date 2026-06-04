package com.example.smartenglish.util

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.smartenglish.data.local.preferences.ReminderPreferences
import com.example.smartenglish.receiver.StudyReminderReceiver
import java.util.Calendar

object StudyReminderHelper {
    private const val TAG = "StudyReminderHelper"
    private const val REMINDER_REQUEST_CODE = 999

    fun scheduleReminder(context: Context) {
        val reminderPrefs = ReminderPreferences(context)
        if (!reminderPrefs.isReminderEnabled()) {
            Log.d(TAG, "scheduleReminder: Reminders are disabled, skipping schedule.")
            return
        }

        val hour = reminderPrefs.getReminderHour()
        val minute = reminderPrefs.getReminderMinute()

        val calendar = Calendar.getInstance().apply {
            timeInMillis = System.currentTimeMillis()
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // If scheduled time is in the past today, schedule for tomorrow
        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, StudyReminderReceiver::class.java)
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REMINDER_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                pendingIntent
            )
            Log.d(TAG, "scheduleReminder: Alarm scheduled successfully for ${calendar.time} (Hour: $hour, Minute: $minute)")
        } catch (e: Exception) {
            Log.e(TAG, "scheduleReminder: Failed to schedule alarm: ${e.message}", e)
        }
    }

    fun cancelReminder(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, StudyReminderReceiver::class.java)
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REMINDER_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )

        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            Log.d(TAG, "cancelReminder: Scheduled alarm cancelled.")
        } else {
            Log.d(TAG, "cancelReminder: No alarm was active to cancel.")
        }
    }
}
