package com.example.smartenglish.data.repository

import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.entity.FlashcardEntity
import com.example.smartenglish.data.remote.api.CardApi
import com.example.smartenglish.data.remote.dto.CreateCardRequest
import com.example.smartenglish.data.remote.dto.UpdateCardRequest
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.SyncStatus
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.util.ApiResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CardRepositoryImpl @Inject constructor(
    private val cardApi: CardApi,
    private val cardDao: FlashcardDao,
    private val setDao: FlashcardSetDao
) : CardRepository {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    override fun getCardsBySet(setId: String): Flow<List<Flashcard>> {
        return cardDao.getCardsBySet(setId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun getCardById(id: String): ApiResult<Flashcard> {
        // Check if it's a valid ObjectId
        if (!isValidObjectId(id)) {
            val localCard = cardDao.getCardById(id)
            return if (localCard != null) {
                ApiResult.Success(localCard.toDomain())
            } else {
                ApiResult.Error("Card not found")
            }
        }

        return try {
            val response = cardApi.getCardById(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val card = data.toDomain()
                    cardDao.insertCard(FlashcardEntity.fromDomain(card))
                    ApiResult.Success(card)
                } else {
                    val localCard = cardDao.getCardById(id)
                    if (localCard != null) {
                        ApiResult.Success(localCard.toDomain())
                    } else {
                        ApiResult.Error("Card not found")
                    }
                }
            } else {
                val localCard = cardDao.getCardById(id)
                if (localCard != null) {
                    ApiResult.Success(localCard.toDomain())
                } else {
                    val errorMessage = response.body()?.error?.message ?: "Failed to get card"
                    ApiResult.Error(errorMessage)
                }
            }
        } catch (e: Exception) {
            val localCard = cardDao.getCardById(id)
            if (localCard != null) {
                ApiResult.Success(localCard.toDomain())
            } else {
                ApiResult.Error(e.message ?: "Network error")
            }
        }
    }

    override suspend fun createCard(
        setId: String,
        front: String,
        back: String,
        pronunciation: String?,
        example: String?,
        note: String?,
        imageUrl: String?
    ): ApiResult<Flashcard> {
        return try {
            val response = cardApi.createCard(
                setId,
                CreateCardRequest(
                    front = front,
                    back = back,
                    pronunciation = pronunciation,
                    example = example,
                    note = note,
                    imageUrl = imageUrl
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val card = data.toDomain()
                    cardDao.insertCard(FlashcardEntity.fromDomain(card))
                    setDao.incrementCardCount(setId)
                    ApiResult.Success(card)
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to create card"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun updateCard(
        id: String,
        front: String?,
        back: String?,
        pronunciation: String?,
        example: String?,
        note: String?,
        imageUrl: String?
    ): ApiResult<Flashcard> {
        if (!isValidObjectId(id)) {
            return ApiResult.Error("Cannot update card that hasn't been synced yet")
        }

        return try {
            val response = cardApi.updateCard(
                id,
                UpdateCardRequest(
                    front = front,
                    back = back,
                    pronunciation = pronunciation,
                    example = example,
                    note = note,
                    imageUrl = imageUrl
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val card = data.toDomain()
                    cardDao.insertCard(FlashcardEntity.fromDomain(card))
                    ApiResult.Success(card)
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to update card"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun deleteCard(id: String): ApiResult<Unit> {
        // Always delete from local DB first
        val card = cardDao.getCardById(id)
        cardDao.deleteCard(id)
        card?.let { setDao.decrementCardCount(it.setId) }

        // If it's not a valid ObjectId, it was never synced
        if (!isValidObjectId(id)) {
            return ApiResult.Success(Unit)
        }

        return try {
            val response = cardApi.deleteCard(id)
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to delete card"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            // Already deleted from local, so consider it success
            ApiResult.Success(Unit)
        }
    }

    override suspend fun searchCards(setId: String, query: String): ApiResult<List<Flashcard>> {
        return try {
            val response = cardApi.searchCards(query, setId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val cards = data.map { it.toDomain() }
                ApiResult.Success(cards)
            } else {
                val localCards = cardDao.searchCards(setId, query)
                ApiResult.Success(localCards.map { it.toDomain() })
            }
        } catch (e: Exception) {
            val localCards = cardDao.searchCards(setId, query)
            ApiResult.Success(localCards.map { it.toDomain() })
        }
    }

    override suspend fun getCardsForStudy(setId: String): List<Flashcard> {
        val currentDate = dateFormat.format(Date())
        return cardDao.getCardsForStudy(setId, currentDate).map { it.toDomain() }
    }

    override suspend fun updateCardStudyProgress(id: String, correct: Boolean) {
        val card = cardDao.getCardById(id) ?: return
        val newStreak = if (correct) card.correctStreak + 1 else 0
        val intervalDays = calculateNextReview(newStreak)
        val nextReviewDate = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, intervalDays)
        }.time

        cardDao.updateStudyProgress(
            id = id,
            streak = newStreak,
            nextReviewDate = dateFormat.format(nextReviewDate)
        )
    }

    private fun calculateNextReview(streak: Int): Int {
        return when (streak) {
            0 -> 1
            1 -> 2
            2 -> 4
            3 -> 8
            4 -> 16
            else -> 30
        }
    }

    override suspend fun syncCards(setId: String) {
        try {
            val response = cardApi.getCardsBySet(setId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                // Delete all cards for this set and replace with server data
                cardDao.deleteCardsBySet(setId)
                // Insert all server cards
                val entities = data.map { FlashcardEntity.fromDomain(it.toDomain()) }
                cardDao.insertCards(entities)
            }
        } catch (_: Exception) {
            // Silently fail - keep local data on network error
        }
    }

    private fun isValidObjectId(id: String): Boolean {
        return id.length == 24 && id.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }
    }
}
