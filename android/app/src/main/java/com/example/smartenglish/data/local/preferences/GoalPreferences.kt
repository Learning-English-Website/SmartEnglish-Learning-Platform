package com.example.smartenglish.data.local.preferences

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GoalPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getDailyXpGoal(): Int {
        return prefs.getInt(KEY_DAILY_XP_GOAL, DEFAULT_XP_GOAL)
    }

    fun setDailyXpGoal(goal: Int) {
        prefs.edit().putInt(KEY_DAILY_XP_GOAL, goal).apply()
    }

    companion object {
        private const val PREFS_NAME = "goal_prefs"
        private const val KEY_DAILY_XP_GOAL = "daily_xp_goal"
        private const val DEFAULT_XP_GOAL = 50
    }
}
