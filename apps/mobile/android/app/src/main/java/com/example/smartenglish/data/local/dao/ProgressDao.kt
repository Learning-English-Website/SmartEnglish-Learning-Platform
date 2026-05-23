package com.example.smartenglish.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.smartenglish.data.local.entity.StudyProgressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProgressDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProgress(progress: StudyProgressEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProgressList(progressList: List<StudyProgressEntity>)

    @Update
    suspend fun updateProgress(progress: StudyProgressEntity)

    @Query("SELECT * FROM study_progress WHERE wordId = :wordId")
    suspend fun getProgressByWordId(wordId: String): StudyProgressEntity?

    @Query("SELECT * FROM study_progress WHERE nextReviewAt <= :currentTime ORDER BY nextReviewAt ASC")
    fun getDueCards(currentTime: String): Flow<List<StudyProgressEntity>>

    @Query("SELECT COUNT(*) FROM study_progress WHERE status = :status")
    fun getCountByStatus(status: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM study_progress")
    fun getTotalCount(): Flow<Int>

    @Query("DELETE FROM study_progress WHERE wordId = :wordId")
    suspend fun deleteProgressByWordId(wordId: String)

    @Query("DELETE FROM study_progress")
    suspend fun deleteAllProgress()
}
