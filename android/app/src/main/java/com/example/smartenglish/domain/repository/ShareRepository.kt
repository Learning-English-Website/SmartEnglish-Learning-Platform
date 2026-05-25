package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.ShareInfo
import com.example.smartenglish.domain.model.Tag
import com.example.smartenglish.util.ApiResult

interface ShareRepository {
    suspend fun getSharedSet(shareCode: String): ApiResult<FlashcardSet>
    suspend fun createShare(setId: String, expiresIn: Int?): ApiResult<ShareInfo>
    suspend fun deleteShare(setId: String): ApiResult<Unit>
    suspend fun getShareBySetId(setId: String): ApiResult<ShareInfo>
    suspend fun getPublicTags(): ApiResult<List<Tag>>
}
