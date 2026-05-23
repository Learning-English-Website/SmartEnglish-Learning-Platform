package com.example.smartenglish.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.smartenglish.data.local.dao.ProgressDao
import com.example.smartenglish.data.local.dao.VocabularyDao
import com.example.smartenglish.data.local.entity.StudyProgressEntity
import com.example.smartenglish.data.local.entity.WordEntity
import com.example.smartenglish.data.local.entity.WordSetEntity

@Database(
    entities = [
        WordSetEntity::class,
        WordEntity::class,
        StudyProgressEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vocabularyDao(): VocabularyDao
    abstract fun progressDao(): ProgressDao
}
