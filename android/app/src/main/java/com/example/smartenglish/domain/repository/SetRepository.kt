package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.util.ApiResult
import kotlinx.coroutines.flow.Flow

interface SetRepository {
    fun getSets(): Flow<List<FlashcardSet>>
    suspend fun getSetById(id: String): ApiResult<FlashcardSet>
    suspend fun createSet(title: String, description: String?, language: String?, isPublic: Boolean, tags: List<String>): ApiResult<FlashcardSet>
    suspend fun updateSet(id: String, title: String?, description: String?, language: String?, isPublic: Boolean?, tags: List<String>?): ApiResult<FlashcardSet>
    suspend fun deleteSet(id: String): ApiResult<Unit>
    suspend fun searchSets(query: String): ApiResult<List<FlashcardSet>>
    suspend fun getPublicSets(query: String?, tags: List<String>?): ApiResult<List<FlashcardSet>>
    suspend fun syncSets()
}
