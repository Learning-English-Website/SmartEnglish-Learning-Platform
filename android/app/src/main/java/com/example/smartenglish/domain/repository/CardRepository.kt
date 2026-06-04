package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.util.ApiResult
import kotlinx.coroutines.flow.Flow

interface CardRepository {
    fun getCardsBySet(setId: String): Flow<List<Flashcard>>
    suspend fun getCardsBySetList(setId: String): List<Flashcard>
    suspend fun getCardById(id: String): ApiResult<Flashcard>
    suspend fun createCard(setId: String, front: String, back: String, pronunciation: String?, example: String?, note: String?, collocation: String?, relatedWords: String?, imageUrl: String?): ApiResult<Flashcard>
    suspend fun bulkCreateCards(setId: String, cards: List<com.example.smartenglish.data.remote.dto.CreateCardRequest>): ApiResult<List<Flashcard>>
    suspend fun updateCard(id: String, front: String?, back: String?, pronunciation: String?, example: String?, note: String?, collocation: String?, relatedWords: String?, imageUrl: String?): ApiResult<Flashcard>
    suspend fun deleteCard(id: String): ApiResult<Unit>
    suspend fun searchCards(setId: String, query: String): ApiResult<List<Flashcard>>
    suspend fun getCardsForStudy(setId: String): List<Flashcard>
    suspend fun updateCardStudyProgress(id: String, correct: Boolean)
    suspend fun syncCards(setId: String)
    suspend fun resetStudyProgressForSet(setId: String)
}
