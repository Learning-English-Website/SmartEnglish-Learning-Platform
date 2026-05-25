package com.example.smartenglish.data.local.dao

import androidx.room.*
import com.example.smartenglish.data.local.entity.FlashcardEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FlashcardDao {

    @Query("SELECT * FROM flashcards WHERE setId = :setId AND syncStatus != 'DELETED' ORDER BY createdAt ASC")
    fun getCardsBySet(setId: String): Flow<List<FlashcardEntity>>

    @Query("SELECT * FROM flashcards WHERE setId = :setId AND syncStatus != 'DELETED' ORDER BY createdAt ASC")
    suspend fun getCardsBySetList(setId: String): List<FlashcardEntity>

    @Query("SELECT * FROM flashcards WHERE id = :id")
    suspend fun getCardById(id: String): FlashcardEntity?

    @Query("SELECT * FROM flashcards WHERE id = :id")
    fun getCardByIdFlow(id: String): Flow<FlashcardEntity?>

    @Query("SELECT * FROM flashcards WHERE setId = :setId AND syncStatus != 'DELETED' AND (front LIKE '%' || :query || '%' OR back LIKE '%' || :query || '%')")
    suspend fun searchCards(setId: String, query: String): List<FlashcardEntity>

    @Query("SELECT * FROM flashcards WHERE syncStatus = 'PENDING' OR syncStatus = 'DIRTY'")
    suspend fun getUnsyncedCards(): List<FlashcardEntity>

    @Query("SELECT * FROM flashcards WHERE setId = :setId AND syncStatus != 'DELETED' AND (nextReviewDate IS NULL OR nextReviewDate <= :currentDate) ORDER BY correctStreak ASC")
    suspend fun getCardsForStudy(setId: String, currentDate: String): List<FlashcardEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCard(card: FlashcardEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCards(cards: List<FlashcardEntity>)

    @Update
    suspend fun updateCard(card: FlashcardEntity)

    @Query("UPDATE flashcards SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String)

    @Query("UPDATE flashcards SET correctStreak = :streak, nextReviewDate = :nextReviewDate, localUpdatedAt = :updatedAt WHERE id = :id")
    suspend fun updateStudyProgress(id: String, streak: Int, nextReviewDate: String, updatedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM flashcards WHERE id = :id")
    suspend fun deleteCard(id: String)

    @Query("DELETE FROM flashcards WHERE syncStatus = 'DELETED'")
    suspend fun deleteSyncedDeletedCards()

    @Query("DELETE FROM flashcards WHERE setId = :setId")
    suspend fun deleteCardsBySet(setId: String)
}
