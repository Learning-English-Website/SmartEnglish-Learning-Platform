package com.example.smartenglish.data.repository

import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.dao.DownloadedContentDao
import com.example.smartenglish.data.local.entity.FlashcardEntity
import com.example.smartenglish.data.remote.api.CardApi
import com.example.smartenglish.data.remote.dto.BulkCreateCardsRequest
import com.example.smartenglish.data.remote.dto.CreateCardRequest
import com.example.smartenglish.data.remote.dto.UpdateCardRequest
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.SyncStatus
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.ErrorParser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import com.example.smartenglish.util.NetworkMonitor
import com.example.smartenglish.data.sync.SyncManager
import com.example.smartenglish.data.sync.CardUpdatePayload
import com.squareup.moshi.Moshi
import java.text.SimpleDateFormat
import java.util.*
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CardRepositoryImpl @Inject constructor(
    private val cardApi: CardApi,
    private val cardDao: FlashcardDao,
    private val setDao: FlashcardSetDao,
    private val downloadedContentDao: DownloadedContentDao,
    private val networkMonitor: NetworkMonitor,
    private val syncManager: SyncManager,
    private val moshi: Moshi
) : CardRepository {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    override fun getCardsBySet(setId: String): Flow<List<Flashcard>> {
        return cardDao.getCardsBySet(setId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun getCardsBySetList(setId: String): List<Flashcard> = withContext(Dispatchers.IO) {
        // If offline, immediately load from local CSDL without waiting for Retrofit/OkHttp timeouts
        if (!networkMonitor.isOnline.value) {
            return@withContext cardDao.getCardsBySetList(setId).map { it.toDomain() }
        }

        // Online: sync cards with server first to pull any updates (preserving local media/progress)
        syncCards(setId)

        return@withContext cardDao.getCardsBySetList(setId).map { it.toDomain() }
    }

    override suspend fun getCardById(id: String): ApiResult<Flashcard> = withContext(Dispatchers.IO) {
        // If offline, immediately load from local CSDL without waiting for Retrofit/OkHttp timeouts
        if (!networkMonitor.isOnline.value) {
            val localCard = cardDao.getCardById(id)
            return@withContext if (localCard != null) {
                ApiResult.Success(localCard.toDomain())
            } else {
                ApiResult.Error("Thẻ không tồn tại ngoại tuyến.")
            }
        }

        // Check if it's a valid ObjectId
        if (!isValidObjectId(id)) {
            val localCard = cardDao.getCardById(id)
            return@withContext if (localCard != null) {
                ApiResult.Success(localCard.toDomain())
            } else {
                ApiResult.Error("Card not found")
            }
        }

        return@withContext try {
            val response = cardApi.getCardById(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val card = data.toDomain()
                    // Preserve offline properties
                    val existing = cardDao.getCardById(card.id)
                    val entity = FlashcardEntity.fromDomain(card).copy(
                        localImagePath = existing?.localImagePath,
                        localAudioPath = existing?.localAudioPath,
                        nextReviewDate = existing?.nextReviewDate ?: card.nextReviewDate,
                        correctStreak = existing?.correctStreak ?: card.correctStreak
                    )
                    cardDao.insertCard(entity)
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
                    val rawError = response.errorBody()?.string()
                        ?: response.body()?.error?.message
                        ?: "Failed to get card"
                    ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
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
        collocation: String?,
        relatedWords: String?,
        imageUrl: String?
    ): ApiResult<Flashcard> = withContext(Dispatchers.IO) {
        // 1. If offline, perform local Room create and queue to SyncManager
        if (!networkMonitor.isOnline.value) {
            return@withContext localCreateAndQueue(setId, front, back, pronunciation, example, note, collocation, relatedWords, imageUrl)
        }

        return@withContext try {
            val response = cardApi.createCard(
                setId,
                CreateCardRequest(
                    front = front,
                    back = back,
                    pronunciation = pronunciation,
                    example = example,
                    note = note,
                    collocation = collocation,
                    relatedWords = relatedWords,
                    imageUrl = imageUrl
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val card = data.toDomain()
                    cardDao.insertCard(FlashcardEntity.fromDomain(card))
                    setDao.incrementCardCount(setId)
                    
                    val localSet = setDao.getSetById(setId)
                    if (localSet != null && localSet.isDownloaded) {
                        syncManager.downloadMediaForCard(setId, card)
                    }
                    
                    ApiResult.Success(card)
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                if (response.code() in 400..409) {
                    val rawError = response.errorBody()?.string()
                        ?: response.body()?.error?.message
                        ?: "Failed to create card"
                    ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
                } else {
                    // If online call fails (e.g. 5xx server error), fallback to local create and queue it to sync later
                    localCreateAndQueue(setId, front, back, pronunciation, example, note, collocation, relatedWords, imageUrl)
                }
            }
        } catch (e: Exception) {
            // If online call throws network error, fallback to local create and queue it
            localCreateAndQueue(setId, front, back, pronunciation, example, note, collocation, relatedWords, imageUrl)
        }
    }

    private suspend fun localCreateAndQueue(
        setId: String,
        front: String,
        back: String,
        pronunciation: String?,
        example: String?,
        note: String?,
        collocation: String?,
        relatedWords: String?,
        imageUrl: String?
    ): ApiResult<Flashcard> = withContext(Dispatchers.IO) {
        val tempId = UUID.randomUUID().toString()
        val card = Flashcard(
            id = tempId,
            setId = setId,
            front = front,
            back = back,
            pronunciation = pronunciation,
            example = example,
            note = note,
            collocation = collocation,
            relatedWords = relatedWords,
            imageUrl = imageUrl,
            createdAt = dateFormat.format(Date()),
            updatedAt = dateFormat.format(Date()),
            syncStatus = SyncStatus.PENDING
        )

        cardDao.insertCard(FlashcardEntity.fromDomain(card))
        setDao.incrementCardCount(setId)
        downloadedContentDao.incrementCardCount(setId)

        // Queue operation in SyncManager
        val payload = com.example.smartenglish.data.sync.CardCreatePayload(
            setId = setId,
            front = front,
            back = back,
            pronunciation = pronunciation,
            example = example,
            note = note,
            collocation = collocation,
            relatedWords = relatedWords,
            imageUrl = imageUrl
        )
        val adapter = moshi.adapter(com.example.smartenglish.data.sync.CardCreatePayload::class.java)
        val jsonPayload = adapter.toJson(payload)
        syncManager.queueOperation("card", tempId, "create", jsonPayload)

        return@withContext ApiResult.Success(card)
    }

    override suspend fun bulkCreateCards(
        setId: String,
        cards: List<CreateCardRequest>
    ): ApiResult<List<Flashcard>> = withContext(Dispatchers.IO) {
        return@withContext try {
            val response = cardApi.bulkCreateCards(setId, BulkCreateCardsRequest(cards))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val created = data.map { it.toDomain() }

                // Cache to local DB
                val entities = created.map { FlashcardEntity.fromDomain(it) }
                cardDao.insertCards(entities)
                repeat(created.size) { setDao.incrementCardCount(setId) }

                val localSet = setDao.getSetById(setId)
                if (localSet != null && localSet.isDownloaded) {
                    for (card in created) {
                        syncManager.downloadMediaForCard(setId, card)
                    }
                    syncManager.updateDownloadedSetSizeAndCount(setId)
                }

                ApiResult.Success(created)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to import cards"
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
        collocation: String?,
        relatedWords: String?,
        imageUrl: String?
    ): ApiResult<Flashcard> = withContext(Dispatchers.IO) {
        if (!isValidObjectId(id)) {
            return@withContext ApiResult.Error("Cannot update card that hasn't been synced yet")
        }

        // 1. If offline, perform local Room update and queue to SyncManager
        if (!networkMonitor.isOnline.value) {
            return@withContext localUpdateAndQueue(id, front, back, pronunciation, example, note, collocation, relatedWords, imageUrl)
        }

        return@withContext try {
            val response = cardApi.updateCard(
                id,
                UpdateCardRequest(
                    front = front,
                    back = back,
                    pronunciation = pronunciation,
                    example = example,
                    note = note,
                    collocation = collocation,
                    relatedWords = relatedWords,
                    imageUrl = imageUrl
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val card = data.toDomain()
                    cardDao.insertCard(FlashcardEntity.fromDomain(card))
                    
                    val localSet = setDao.getSetById(card.setId)
                    if (localSet != null && localSet.isDownloaded) {
                        syncManager.downloadMediaForCard(card.setId, card)
                    }
                    
                    ApiResult.Success(card)
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                if (response.code() in 400..409) {
                    val rawError = response.errorBody()?.string()
                        ?: response.body()?.error?.message
                        ?: "Failed to update card"
                    ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
                } else {
                    // If online call fails (e.g. 5xx server error), fallback to local update and queue it to sync later
                    localUpdateAndQueue(id, front, back, pronunciation, example, note, collocation, relatedWords, imageUrl)
                }
            }
        } catch (e: Exception) {
            // If online call throws network error, fallback to local update and queue it
            localUpdateAndQueue(id, front, back, pronunciation, example, note, collocation, relatedWords, imageUrl)
        }
    }

    private suspend fun localUpdateAndQueue(
        id: String,
        front: String?,
        back: String?,
        pronunciation: String?,
        example: String?,
        note: String?,
        collocation: String?,
        relatedWords: String?,
        imageUrl: String?
    ): ApiResult<Flashcard> = withContext(Dispatchers.IO) {
        val existingEntity = cardDao.getCardById(id)
            ?: return@withContext ApiResult.Error("Thẻ không tồn tại cục bộ.")

        val updatedEntity = existingEntity.copy(
            front = front ?: existingEntity.front,
            back = back ?: existingEntity.back,
            pronunciation = pronunciation ?: existingEntity.pronunciation,
            example = example ?: existingEntity.example,
            note = note ?: existingEntity.note,
            collocation = collocation ?: existingEntity.collocation,
            relatedWords = relatedWords ?: existingEntity.relatedWords,
            imageUrl = imageUrl ?: existingEntity.imageUrl,
            syncStatus = SyncStatus.DIRTY.name
        )
        cardDao.insertCard(updatedEntity)

        // Queue operation in SyncManager
        val payload = CardUpdatePayload(
            front = front ?: existingEntity.front,
            back = back ?: existingEntity.back,
            pronunciation = pronunciation ?: existingEntity.pronunciation,
            example = example ?: existingEntity.example,
            note = note ?: existingEntity.note,
            collocation = collocation ?: existingEntity.collocation,
            relatedWords = relatedWords ?: existingEntity.relatedWords,
            imageUrl = imageUrl ?: existingEntity.imageUrl
        )
        val adapter = moshi.adapter(CardUpdatePayload::class.java)
        val jsonPayload = adapter.toJson(payload)
        syncManager.queueOperation("card", id, "update", jsonPayload)

        return@withContext ApiResult.Success(updatedEntity.toDomain())
    }

    override suspend fun deleteCard(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        // Always delete from local DB first
        val card = cardDao.getCardById(id)
        cardDao.deleteCard(id)
        card?.let { 
            setDao.decrementCardCount(it.setId)
            downloadedContentDao.decrementCardCount(it.setId)
            
            // Delete local media files if they exist
            it.localImagePath?.let { path -> java.io.File(path).delete() }
            it.localAudioPath?.let { path -> java.io.File(path).delete() }
            
            syncManager.updateDownloadedSetSizeAndCount(it.setId)
        }

        // If it's not a valid ObjectId, it was never synced
        if (!isValidObjectId(id)) {
            syncManager.cancelPendingCreate("card", id)
            return@withContext ApiResult.Success(Unit)
        }

        if (!networkMonitor.isOnline.value) {
            syncManager.queueOperation("card", id, "delete", "{}")
            return@withContext ApiResult.Success(Unit)
        }

        return@withContext try {
            val response = cardApi.deleteCard(id)
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(Unit)
            } else {
                // Server or other non-success response: queue deletion to retry later
                syncManager.queueOperation("card", id, "delete", "{}")
                ApiResult.Success(Unit)
            }
        } catch (e: Exception) {
            // Network or connection timeout: queue deletion
            syncManager.queueOperation("card", id, "delete", "{}")
            ApiResult.Success(Unit)
        }
    }

    override suspend fun searchCards(setId: String, query: String): ApiResult<List<Flashcard>> = withContext(Dispatchers.IO) {
        return@withContext try {
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

    override suspend fun getCardsForStudy(setId: String): List<Flashcard> = withContext(Dispatchers.IO) {
        val currentDate = dateFormat.format(Date())
        return@withContext cardDao.getCardsForStudy(setId, currentDate).map { it.toDomain() }
    }

    override suspend fun updateCardStudyProgress(id: String, correct: Boolean) = withContext(Dispatchers.IO) {
        val card = cardDao.getCardById(id) ?: return@withContext
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

    override suspend fun syncCards(setId: String) = withContext(Dispatchers.IO) {
        if (syncManager.hasPendingOperations()) {
            Log.i("CardRepository", "syncCards: Pending operations exist. Processing them first to avoid data loss.")
            syncManager.processPendingOperations()
            
            // Abort pull from server if pending operations still exist (push failed)
            if (syncManager.hasPendingOperations()) {
                Log.w("CardRepository", "syncCards: Push failed or pending operations still exist. Aborting server fetch to protect local data.")
                return@withContext
            }
        }

        try {
            val response = cardApi.getCardsBySet(setId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val cards = data.map { it.toDomain() }
                
                // Get existing local cards to preserve downloaded media and study state properties
                val existingCards = cardDao.getCardsBySetList(setId).associateBy { it.id }
                
                val entities = cards.map { card ->
                    val existing = existingCards[card.id]
                    FlashcardEntity.fromDomain(card).copy(
                        localImagePath = existing?.localImagePath,
                        localAudioPath = existing?.localAudioPath,
                        nextReviewDate = existing?.nextReviewDate ?: card.nextReviewDate,
                        correctStreak = existing?.correctStreak ?: card.correctStreak
                    )
                }
                
                // Prune cards that are no longer on the server
                val serverIds = cards.map { it.id }.toSet()
                val localIdsToDelete = existingCards.keys.filter { it !in serverIds }
                if (localIdsToDelete.isNotEmpty()) {
                    for (idToDelete in localIdsToDelete) {
                        val oldCard = existingCards[idToDelete]
                        oldCard?.localImagePath?.let { path -> java.io.File(path).delete() }
                        oldCard?.localAudioPath?.let { path -> java.io.File(path).delete() }
                        cardDao.deleteCard(idToDelete)
                    }
                }
                
                cardDao.insertCards(entities)

                // If downloaded, also download media for any new cards and updateDownloadedSetSizeAndCount
                val localSet = setDao.getSetById(setId)
                if (localSet != null && localSet.isDownloaded) {
                    for (card in cards) {
                        val existing = existingCards[card.id]
                        if (existing == null || 
                            (card.imageUrl != null && existing.localImagePath == null) ||
                            (card.pronunciation != null && existing.localAudioPath == null)) {
                            syncManager.downloadMediaForCard(setId, card)
                        }
                    }
                    syncManager.updateDownloadedSetSizeAndCount(setId)
                }
            }
        } catch (_: Exception) {
            // Silently fail - keep local data on network error
        }
    }

    override suspend fun resetStudyProgressForSet(setId: String) = withContext(Dispatchers.IO) {
        cardDao.resetStudyProgressForSet(setId)
    }

    private fun isValidObjectId(id: String): Boolean {
        return id.length == 24 && id.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }
    }
}
