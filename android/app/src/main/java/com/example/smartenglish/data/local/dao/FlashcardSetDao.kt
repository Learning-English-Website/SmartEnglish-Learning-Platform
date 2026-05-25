package com.example.smartenglish.data.local.dao

import androidx.room.*
import com.example.smartenglish.data.local.entity.FlashcardSetEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FlashcardSetDao {

    @Query("SELECT * FROM flashcard_sets WHERE syncStatus != 'DELETED' ORDER BY localUpdatedAt DESC")
    fun getAllSets(): Flow<List<FlashcardSetEntity>>

    @Query("SELECT * FROM flashcard_sets WHERE syncStatus != 'DELETED' ORDER BY localUpdatedAt DESC")
    suspend fun getAllSetsList(): List<FlashcardSetEntity>

    @Query("SELECT * FROM flashcard_sets WHERE syncStatus != 'DELETED' ORDER BY localUpdatedAt DESC")
    suspend fun getMySetsList(): List<FlashcardSetEntity>

    @Query("SELECT * FROM flashcard_sets WHERE syncStatus != 'DELETED' ORDER BY localUpdatedAt DESC")
    fun getMySets(): Flow<List<FlashcardSetEntity>>

    @Query("SELECT * FROM flashcard_sets WHERE id = :id")
    suspend fun getSetById(id: String): FlashcardSetEntity?

    @Query("SELECT * FROM flashcard_sets WHERE id = :id")
    fun getSetByIdFlow(id: String): Flow<FlashcardSetEntity?>

    @Query("SELECT * FROM flashcard_sets WHERE syncStatus != 'DELETED' AND (title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%')")
    suspend fun searchSets(query: String): List<FlashcardSetEntity>

    @Query("SELECT * FROM flashcard_sets WHERE syncStatus = 'PENDING' OR syncStatus = 'DIRTY'")
    suspend fun getUnsyncedSets(): List<FlashcardSetEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSet(set: FlashcardSetEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSets(sets: List<FlashcardSetEntity>)

    @Update
    suspend fun updateSet(set: FlashcardSetEntity)

    @Query("UPDATE flashcard_sets SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String)

    @Query("DELETE FROM flashcard_sets WHERE id = :id")
    suspend fun deleteSet(id: String)

    @Query("DELETE FROM flashcard_sets WHERE syncStatus = 'DELETED'")
    suspend fun deleteSyncedDeletedSets()

    @Query("DELETE FROM flashcard_sets WHERE id NOT IN (:ids)")
    suspend fun deleteAllExceptIds(ids: List<String>)

    @Query("UPDATE flashcard_sets SET cardCount = cardCount + 1 WHERE id = :setId")
    suspend fun incrementCardCount(setId: String)

    @Query("UPDATE flashcard_sets SET cardCount = cardCount - 1 WHERE id = :setId AND cardCount > 0")
    suspend fun decrementCardCount(setId: String)
}
