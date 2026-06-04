package com.example.smartenglish.data.repository

import android.util.Log
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.entity.FlashcardSetEntity
import com.example.smartenglish.data.remote.api.SetApi
import com.example.smartenglish.data.remote.dto.CreateSetRequest
import com.example.smartenglish.data.remote.dto.UpdateSetRequest
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.SyncStatus
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.util.NetworkMonitor
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.TokenManager
import com.example.smartenglish.util.ErrorParser
import com.example.smartenglish.data.sync.SyncManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SetRepositoryImpl @Inject constructor(
    private val setApi: SetApi,
    private val setDao: FlashcardSetDao,
    private val networkMonitor: NetworkMonitor,
    private val syncManager: SyncManager,
    private val tokenManager: TokenManager
) : SetRepository {

    companion object {
        private const val TAG = "SetRepository"
    }

    override fun getSets(): Flow<List<FlashcardSet>> {
        val currentUserId = tokenManager.getUserId() ?: ""
        return setDao.getAllSets(currentUserId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getMySets(): Flow<List<FlashcardSet>> {
        val currentUserId = tokenManager.getUserId() ?: ""
        return setDao.getMySets(currentUserId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun getMySetsList(): List<FlashcardSet> = withContext(Dispatchers.IO) {
        val currentUserId = tokenManager.getUserId() ?: ""
        return@withContext setDao.getMySetsList(currentUserId).map { it.toDomain() }
    }

    override suspend fun getSetById(id: String): ApiResult<FlashcardSet> = withContext(Dispatchers.IO) {
        Log.d(TAG, "getSetById: $id")
        val currentUserId = tokenManager.getUserId() ?: ""
        
        // Check local DB first. If it's downloaded offline or belongs to the current user, return it instantly!
        val localSet = setDao.getSetById(id)
        if (localSet != null && (localSet.isDownloaded || localSet.userId == currentUserId)) {
            if (localSet.isDownloaded) {
                Log.d(TAG, "getSetById: Found downloaded set in local DB, returning instantly")
            } else {
                Log.d(TAG, "getSetById: Found user's own set in local DB, returning instantly")
            }
            return@withContext ApiResult.Success(localSet.toDomain())
        }
        
        // If offline, immediately load from local CSDL without waiting for Retrofit/OkHttp timeouts
        if (!networkMonitor.isOnline.value) {
            return@withContext if (localSet != null && (localSet.isDownloaded || localSet.userId == currentUserId)) {
                ApiResult.Success(localSet.toDomain())
            } else {
                ApiResult.Error("Thiết bị đang ngoại tuyến và học phần này chưa được tải về.")
            }
        }
        
        // Check if it's a valid MongoDB ObjectId (24 hex chars) before calling API
        if (!isValidObjectId(id)) {
            Log.d(TAG, "getSetById: Not valid ObjectId, checking local DB")
            // It's a local UUID, get from local DB only
            return@withContext if (localSet != null && (localSet.isDownloaded || localSet.userId == currentUserId)) {
                Log.d(TAG, "getSetById: Found in local DB")
                ApiResult.Success(localSet.toDomain())
            } else {
                Log.d(TAG, "getSetById: Not found in local DB")
                ApiResult.Error("Set not found")
            }
        }

        return@withContext try {
            Log.d(TAG, "getSetById: Calling API with valid ObjectId")
            val response = setApi.getSetById(id)
            Log.d(TAG, "getSetById: API response - success=${response.isSuccessful}")
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val set = data.toDomain()
                    Log.d(TAG, "getSetById: Got set from API - ${set.title}")
                    // Save to local DB preserving offline downloaded properties
                    val existing = setDao.getSetById(set.id)
                    val entity = FlashcardSetEntity.fromDomain(set).copy(
                        isDownloaded = existing?.isDownloaded ?: false,
                        downloadedAt = existing?.downloadedAt,
                        localMediaPath = existing?.localMediaPath
                    )
                    // Security Check: Only save if the set belongs to current user or is public
                    if (set.userId == currentUserId || set.isPublic) {
                        setDao.insertOrUpdate(entity)
                    }
                    ApiResult.Success(set)
                } else {
                    // Try to get from local DB
                    if (localSet != null && (localSet.isDownloaded || localSet.userId == currentUserId)) {
                        ApiResult.Success(localSet.toDomain())
                    } else {
                        Log.d(TAG, "getSetById: No data from API and not in local DB")
                        ApiResult.Error("Set not found")
                    }
                }
            } else {
                Log.d(TAG, "getSetById: API call failed")
                // Try to get from local DB
                if (localSet != null && (localSet.isDownloaded || localSet.userId == currentUserId)) {
                    ApiResult.Success(localSet.toDomain())
                } else {
                    val rawError = response.errorBody()?.string()
                        ?: response.body()?.error?.message
                        ?: "Failed to get set"
                    Log.d(TAG, "getSetById: Error - $rawError")
                    ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSetById: Exception - ${e.message}")
            // Try to get from local DB on network error
            if (localSet != null && (localSet.isDownloaded || localSet.userId == currentUserId)) {
                ApiResult.Success(localSet.toDomain())
            } else {
                ApiResult.Error(e.message ?: "Network error")
            }
        }
    }

    override suspend fun createSet(
        title: String,
        description: String?,
        language: String?,
        isPublic: Boolean,
        tags: List<String>
    ): ApiResult<FlashcardSet> = withContext(Dispatchers.IO) {
        Log.d(TAG, "createSet: title=$title")
        return@withContext try {
            val response = setApi.createSet(
                CreateSetRequest(
                    title = title,
                    description = description,
                    language = language ?: "English",
                    isPublic = isPublic,
                    tags = tags
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val set = data.toDomain()
                    Log.d(TAG, "createSet: Success - id=${set.id}")
                    setDao.insertOrUpdate(FlashcardSetEntity.fromDomain(set))
                    ApiResult.Success(set)
                } else {
                    Log.d(TAG, "createSet: No data received")
                    ApiResult.Error("No data received")
                }
            } else {
                val rawError = response.errorBody()?.string()
                    ?: response.body()?.error?.message
                    ?: "Failed to create set"
                Log.d(TAG, "createSet: Error - $rawError")
                ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
            }
        } catch (e: Exception) {
            Log.e(TAG, "createSet: Exception - ${e.message}")
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun updateSet(
        id: String,
        title: String?,
        description: String?,
        language: String?,
        isPublic: Boolean?,
        tags: List<String>?
    ): ApiResult<FlashcardSet> = withContext(Dispatchers.IO) {
        Log.d(TAG, "updateSet: id=$id")
        
        // Check if it's a valid ObjectId before calling API
        if (!isValidObjectId(id)) {
            Log.d(TAG, "updateSet: Invalid ObjectId")
            return@withContext ApiResult.Error("Cannot update set that hasn't been synced yet")
        }

        return@withContext try {
            val response = setApi.updateSet(
                id,
                UpdateSetRequest(
                    title = title,
                    description = description,
                    language = language,
                    isPublic = isPublic,
                    tags = tags
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val set = data.toDomain()
                    // Save to local DB preserving offline downloaded properties
                    val existing = setDao.getSetById(set.id)
                    val entity = FlashcardSetEntity.fromDomain(set).copy(
                        isDownloaded = existing?.isDownloaded ?: false,
                        downloadedAt = existing?.downloadedAt,
                        localMediaPath = existing?.localMediaPath
                    )
                    setDao.insertOrUpdate(entity)
                    ApiResult.Success(set)
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val rawError = response.errorBody()?.string()
                    ?: response.body()?.error?.message
                    ?: "Failed to update set"
                ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun deleteSet(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        Log.d(TAG, "deleteSet: id=$id, isValid=${isValidObjectId(id)}")
        
        // First, mark as DELETED in local DB (don't delete yet)
        val existingSet = setDao.getSetById(id)
        if (existingSet != null) {
            setDao.updateSyncStatus(id, SyncStatus.DELETED.name)
            Log.d(TAG, "deleteSet: Marked as DELETED locally")
        }

        // If it's not a valid ObjectId, it was never synced, so remove from local
        if (!isValidObjectId(id)) {
            Log.d(TAG, "deleteSet: Not synced, removing from local")
            setDao.deleteSet(id)
            return@withContext ApiResult.Success(Unit)
        }

        // Try to delete from server
        return@withContext try {
            val response = setApi.deleteSet(id)
            Log.d(TAG, "deleteSet: API response - success=${response.isSuccessful}")
            
            if (response.isSuccessful && response.body()?.success == true) {
                // Delete from local DB after successful server delete
                setDao.deleteSet(id)
                Log.d(TAG, "deleteSet: Deleted from local DB")
                ApiResult.Success(Unit)
            } else {
                // Keep marked as DELETED, will be synced later
                Log.d(TAG, "deleteSet: Server delete failed, will retry on sync")
                ApiResult.Error(response.body()?.error?.message ?: "Failed to delete set")
            }
        } catch (e: Exception) {
            Log.e(TAG, "deleteSet: Exception - ${e.message}")
            // Keep marked as DELETED, will retry on sync
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun searchSets(query: String): ApiResult<List<FlashcardSet>> = withContext(Dispatchers.IO) {
        val currentUserId = tokenManager.getUserId() ?: ""
        return@withContext try {
            val response = setApi.getSets(query = query)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val sets = data.map { it.toDomain() }
                // Update local DB with search results preserving offline downloaded properties
                val entities = data.map { dto ->
                    val domain = dto.toDomain()
                    val existing = setDao.getSetById(domain.id)
                    FlashcardSetEntity.fromDomain(domain).copy(
                        isDownloaded = existing?.isDownloaded ?: false,
                        downloadedAt = existing?.downloadedAt,
                        localMediaPath = existing?.localMediaPath
                    )
                }
                setDao.insertOrUpdate(entities)
                ApiResult.Success(sets)
            } else {
                val localSets = setDao.searchSets(query, currentUserId)
                ApiResult.Success(localSets.map { it.toDomain() })
            }
        } catch (e: Exception) {
            val localSets = setDao.searchSets(query, currentUserId)
            ApiResult.Success(localSets.map { it.toDomain() })
        }
    }

    override suspend fun getPublicSets(query: String?, tags: List<String>?): ApiResult<List<FlashcardSet>> = withContext(Dispatchers.IO) {
        return@withContext try {
            val tagsStr = tags?.joinToString(",")
            val response = setApi.getPublicSets(
                query = query,
                tags = tagsStr
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val sets = data.map { it.toDomain() }
                ApiResult.Success(sets)
            } else {
                ApiResult.Error("Failed to get public sets")
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun syncPublicSets() {
        withContext(Dispatchers.IO) {
            Log.d(TAG, "syncPublicSets: Starting...")
            try {
                val response = setApi.getPublicSets(query = null, tags = null)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data ?: emptyList()
                    Log.d(TAG, "syncPublicSets: Got ${data.size} public sets from server")
                    val entities = data.map { FlashcardSetEntity.fromDomain(it.toDomain()) }
                    // Insert public sets (they may be shared by others — don't overwrite user's own sets)
                    for (entity in entities) {
                        val existing = setDao.getSetById(entity.id)
                        if (existing == null || existing.userId == entity.userId) {
                            setDao.insertOrUpdate(entity)
                        }
                    }
                }
            } catch (_: Exception) {
                Log.e(TAG, "syncPublicSets: Exception")
            }
            Log.d(TAG, "syncPublicSets: Done")
        }
    }

    override suspend fun syncSets() {
        withContext(Dispatchers.IO) {
            Log.d(TAG, "syncSets: Starting...")
            if (syncManager.hasPendingOperations()) {
                Log.i(TAG, "syncSets: Pending operations exist. Processing them first to avoid data loss.")
                syncManager.processPendingOperations()
                if (syncManager.hasPendingOperations()) {
                    Log.w(TAG, "syncSets: Push failed or pending operations still exist. Aborting server fetch to protect local data.")
                    return@withContext
                }
            }

            try {
                // First, sync any pending deletes to server
                val deletedSets = setDao.getUnsyncedSets().filter { 
                    SyncStatus.valueOf(it.syncStatus) == SyncStatus.DELETED 
                }
                Log.d(TAG, "syncSets: Found ${deletedSets.size} sets marked as DELETED")
                
                for (set in deletedSets) {
                    try {
                        val response = setApi.deleteSet(set.id)
                        if (response.isSuccessful && response.body()?.success == true) {
                            setDao.deleteSet(set.id)
                            Log.d(TAG, "syncSets: Deleted ${set.id} from server")
                        }
                    } catch (_: Exception) {
                        // Keep marked as DELETED for next sync
                        Log.d(TAG, "syncSets: Failed to delete ${set.id} from server")
                    }
                }

                // Then fetch fresh data from server
                val response = setApi.getSets()
                Log.d(TAG, "syncSets: API response - success=${response.isSuccessful}")
                
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data ?: emptyList()
                    Log.d(TAG, "syncSets: Got ${data.size} sets from server")
                    
                    // Delete locally deleted sets from local DB
                    // (already deleted from server above)
                    
                    // Insert all server sets preserving offline downloaded properties
                    val entities = data.map { dto ->
                        val domain = dto.toDomain()
                        val existing = setDao.getSetById(domain.id)
                        FlashcardSetEntity.fromDomain(domain).copy(
                            isDownloaded = existing?.isDownloaded ?: false,
                            downloadedAt = existing?.downloadedAt,
                            localMediaPath = existing?.localMediaPath
                        )
                    }
                    setDao.insertOrUpdate(entities)
                    Log.d(TAG, "syncSets: Inserted ${entities.size} sets to local DB")
                }
            } catch (_: Exception) {
                Log.e(TAG, "syncSets: Exception")
            }
            Log.d(TAG, "syncSets: Done")
        }
    }

    private fun isValidObjectId(id: String): Boolean {
        // MongoDB ObjectId is a 24-character hexadecimal string
        return id.length == 24 && id.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }
    }
}
