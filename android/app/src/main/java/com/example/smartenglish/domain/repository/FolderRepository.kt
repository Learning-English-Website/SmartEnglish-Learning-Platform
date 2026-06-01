package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.Folder
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.util.ApiResult
import kotlinx.coroutines.flow.Flow

interface FolderRepository {
    fun observeFolders(): Flow<List<Folder>>
    suspend fun getFolders(): ApiResult<List<Folder>>
    suspend fun getFolderById(id: String): ApiResult<Folder>
    suspend fun createFolder(name: String, parentId: String?): ApiResult<Folder>
    suspend fun updateFolder(id: String, name: String?, parentId: String?): ApiResult<Folder>
    suspend fun deleteFolder(id: String): ApiResult<Unit>
    suspend fun getFolderSets(id: String): ApiResult<List<FlashcardSet>>
    suspend fun addSetToFolder(id: String, setId: String): ApiResult<Folder>
    suspend fun removeSetFromFolder(id: String, setId: String): ApiResult<Folder>
}
