package com.example.smartenglish.data.local.dao

import androidx.room.*
import com.example.smartenglish.data.local.entity.PendingOperationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingOperationDao {
    @Query("SELECT * FROM pending_operations ORDER BY createdAt ASC")
    suspend fun getAllPending(): List<PendingOperationEntity>

    @Query("SELECT * FROM pending_operations WHERE entityId = :entityId AND entityType = :entityType ORDER BY createdAt DESC")
    suspend fun getOperationsByEntity(entityId: String, entityType: String): List<PendingOperationEntity>

    @Insert
    suspend fun insert(operation: PendingOperationEntity): Long

    @Delete
    suspend fun delete(operation: PendingOperationEntity)

    @Query("DELETE FROM pending_operations WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM pending_operations WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<Long>)

    @Query("UPDATE pending_operations SET retryCount = retryCount + 1 WHERE id = :id")
    suspend fun incrementRetry(id: Long)

    @Query("DELETE FROM pending_operations WHERE retryCount > :maxRetries")
    suspend fun deleteFailed(maxRetries: Int = 5)

    @Query("SELECT COUNT(*) FROM pending_operations")
    fun getPendingCount(): Flow<Int>

    @Query("DELETE FROM pending_operations WHERE entityId = :entityId AND entityType = :entityType AND operation = :op")
    suspend fun deleteByEntityAndOp(entityId: String, entityType: String, op: String)

    @Query("DELETE FROM pending_operations")
    suspend fun deleteAllPending()
}
