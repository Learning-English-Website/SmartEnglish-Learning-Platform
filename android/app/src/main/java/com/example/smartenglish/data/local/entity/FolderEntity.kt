package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "folders")
data class FolderEntity(
    @PrimaryKey val id: String,
    val name: String,
    val parentId: String? = null,
    val isDownloaded: Boolean = false,
    val downloadedAt: Long? = null,
    val syncStatus: String = "SYNCED",
    val localCreatedAt: Long = System.currentTimeMillis(),
    val localUpdatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        fun fromDomain(folder: com.example.smartenglish.domain.model.Folder): FolderEntity {
            return FolderEntity(
                id = folder.id,
                name = folder.name,
                parentId = folder.parentId,
                syncStatus = "SYNCED",
                localCreatedAt = System.currentTimeMillis(),
                localUpdatedAt = System.currentTimeMillis()
            )
        }
    }
}
