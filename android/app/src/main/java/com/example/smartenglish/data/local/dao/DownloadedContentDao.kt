package com.example.smartenglish.data.local.dao

import androidx.room.*
import com.example.smartenglish.data.local.entity.DownloadedContentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DownloadedContentDao {
    @Query("SELECT * FROM downloaded_content")
    fun getAllDownloaded(): Flow<List<DownloadedContentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(content: DownloadedContentEntity)

    @Delete
    suspend fun delete(content: DownloadedContentEntity)

    @Query("DELETE FROM downloaded_content WHERE contentId = :id")
    suspend fun deleteById(id: String)

    @Query("SELECT * FROM downloaded_content WHERE contentId = :id")
    suspend fun getById(id: String): DownloadedContentEntity?

    @Query("SELECT SUM(sizeBytes) FROM downloaded_content")
    fun getTotalDownloadedSize(): Flow<Long?>
}
