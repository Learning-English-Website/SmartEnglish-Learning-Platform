package com.example.smartenglish.presentation.home

data class HomeProgressState(
    val todayXp: Int = 0,
    val dailyXpGoal: Int = 50,
    val streak: Int = 0,
    val dueToday: Int = 0,
    val masteredCards: Int = 0
)
