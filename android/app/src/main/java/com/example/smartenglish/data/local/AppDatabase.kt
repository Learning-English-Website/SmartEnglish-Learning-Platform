package com.example.smartenglish.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.smartenglish.data.local.dao.DownloadedContentDao
import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.dao.FolderDao
import com.example.smartenglish.data.local.dao.PendingOperationDao
import com.example.smartenglish.data.local.dao.ProgressDao
import com.example.smartenglish.data.local.dao.VocabularyDao
import com.example.smartenglish.data.local.entity.DownloadedContentEntity
import com.example.smartenglish.data.local.entity.FlashcardEntity
import com.example.smartenglish.data.local.entity.FlashcardSetEntity
import com.example.smartenglish.data.local.entity.FolderEntity
import com.example.smartenglish.data.local.entity.PendingOperationEntity
import com.example.smartenglish.data.local.entity.StudyProgressEntity
import com.example.smartenglish.data.local.entity.WordEntity
import com.example.smartenglish.data.local.entity.WordSetEntity

@Database(
    entities = [
        WordSetEntity::class,
        WordEntity::class,
        StudyProgressEntity::class,
        FlashcardSetEntity::class,
        FlashcardEntity::class,
        FolderEntity::class,
        PendingOperationEntity::class,
        DownloadedContentEntity::class
    ],
    version = 5,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vocabularyDao(): VocabularyDao
    abstract fun progressDao(): ProgressDao
    abstract fun flashcardSetDao(): FlashcardSetDao
    abstract fun flashcardDao(): FlashcardDao
    abstract fun folderDao(): FolderDao
    abstract fun pendingOperationDao(): PendingOperationDao
    abstract fun downloadedContentDao(): DownloadedContentDao
}
