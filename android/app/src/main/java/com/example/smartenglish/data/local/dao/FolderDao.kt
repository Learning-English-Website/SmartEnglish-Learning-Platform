package com.example.smartenglish.data.local.dao

import androidx.room.*
import com.example.smartenglish.data.local.entity.FolderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FolderDao {
    @Query("SELECT * FROM folders")
    fun getAllFolders(): Flow<List<FolderEntity>>

    @Query("SELECT * FROM folders WHERE isDownloaded = 1")
    fun getDownloadedFolders(): Flow<List<FolderEntity>>

    @Query("SELECT * FROM folders WHERE id = :id")
    suspend fun getFolderById(id: String): FolderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFolder(folder: FolderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFolders(folders: List<FolderEntity>)

    @Update
    suspend fun updateFolder(folder: FolderEntity)

    @Query("UPDATE folders SET isDownloaded = :downloaded, downloadedAt = :downloadedAt WHERE id = :folderId")
    suspend fun updateDownloadStatus(folderId: String, downloaded: Boolean, downloadedAt: Long?)

    @Query("DELETE FROM folders WHERE id = :id")
    suspend fun deleteFolder(id: String)

    @Query("SELECT * FROM folders WHERE syncStatus IN ('PENDING', 'DIRTY')")
    suspend fun getUnsyncedFolders(): List<FolderEntity>
}
