package com.example.smartenglish.data.repository

import android.util.Log
import com.example.smartenglish.data.remote.api.FolderApi
import com.example.smartenglish.data.remote.dto.*
import com.example.smartenglish.domain.model.Folder
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.FolderRepository
import com.example.smartenglish.util.ApiResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FolderRepositoryImpl @Inject constructor(
    private val folderApi: FolderApi
) : FolderRepository {

    private val _foldersFlow = MutableStateFlow<List<Folder>>(emptyList())

    override fun observeFolders(): Flow<List<Folder>> = _foldersFlow.asStateFlow()

    companion object {
        private const val TAG = "FolderRepository"
    }

    override suspend fun getFolders(): ApiResult<List<Folder>> {
        return try {
            val response = folderApi.getFolders()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val folders = data.map { it.toDomain() }
                _foldersFlow.value = folders
                ApiResult.Success(folders)
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to get folders")
            }
        } catch (e: Exception) {
            Log.e(TAG, "getFolders: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getFolderById(id: String): ApiResult<Folder> {
        return try {
            val response = folderApi.getFolderById(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Folder not found")
                }
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to get folder")
            }
        } catch (e: Exception) {
            Log.e(TAG, "getFolderById: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun createFolder(name: String, parentId: String?): ApiResult<Folder> {
        return try {
            val response = folderApi.createFolder(CreateFolderRequest(name, parentId))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val folder = data.toDomain()
                    getFolders() // update cache Flow
                    ApiResult.Success(folder)
                } else {
                    ApiResult.Error("Folder creation returned no data")
                }
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to create folder")
            }
        } catch (e: Exception) {
            Log.e(TAG, "createFolder: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun updateFolder(id: String, name: String?, parentId: String?): ApiResult<Folder> {
        return try {
            val response = folderApi.updateFolder(id, UpdateFolderRequest(name, parentId))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Folder update returned no data")
                }
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to update folder")
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateFolder: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun deleteFolder(id: String): ApiResult<Unit> {
        return try {
            val response = folderApi.deleteFolder(id)
            if (response.isSuccessful && response.body()?.success == true) {
                getFolders() // update cache Flow
                ApiResult.Success(Unit)
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to delete folder")
            }
        } catch (e: Exception) {
            Log.e(TAG, "deleteFolder: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getFolderSets(id: String): ApiResult<List<FlashcardSet>> {
        return try {
            val response = folderApi.getFolderSets(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val sets = response.body()?.data?.sets ?: emptyList()
                ApiResult.Success(sets.map { it.toDomain() })
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to get folder sets")
            }
        } catch (e: Exception) {
            Log.e(TAG, "getFolderSets: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun addSetToFolder(id: String, setId: String): ApiResult<Folder> {
        return try {
            val response = folderApi.addSetToFolder(id, AddSetToFolderRequest(setId))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data returned after adding set")
                }
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to add set to folder")
            }
        } catch (e: Exception) {
            Log.e(TAG, "addSetToFolder: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun removeSetFromFolder(id: String, setId: String): ApiResult<Folder> {
        return try {
            val response = folderApi.removeSetFromFolder(id, setId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data returned after removing set")
                }
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to remove set from folder")
            }
        } catch (e: Exception) {
            Log.e(TAG, "removeSetFromFolder: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}
