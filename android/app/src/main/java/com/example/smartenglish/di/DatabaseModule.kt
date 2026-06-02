package com.example.smartenglish.di

import android.content.Context
import androidx.room.Room
import com.example.smartenglish.data.local.AppDatabase
import com.example.smartenglish.data.local.dao.DownloadedContentDao
import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.dao.FolderDao
import com.example.smartenglish.data.local.dao.PendingOperationDao
import com.example.smartenglish.data.local.dao.ProgressDao
import com.example.smartenglish.data.local.dao.VocabularyDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "smartenglish_db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideVocabularyDao(database: AppDatabase): VocabularyDao {
        return database.vocabularyDao()
    }

    @Provides
    @Singleton
    fun provideProgressDao(database: AppDatabase): ProgressDao {
        return database.progressDao()
    }

    @Provides
    @Singleton
    fun provideFlashcardSetDao(database: AppDatabase): FlashcardSetDao {
        return database.flashcardSetDao()
    }

    @Provides
    @Singleton
    fun provideFlashcardDao(database: AppDatabase): FlashcardDao {
        return database.flashcardDao()
    }

    @Provides
    @Singleton
    fun provideFolderDao(database: AppDatabase): FolderDao {
        return database.folderDao()
    }

    @Provides
    @Singleton
    fun providePendingOperationDao(database: AppDatabase): PendingOperationDao {
        return database.pendingOperationDao()
    }

    @Provides
    @Singleton
    fun provideDownloadedContentDao(database: AppDatabase): DownloadedContentDao {
        return database.downloadedContentDao()
    }
}
