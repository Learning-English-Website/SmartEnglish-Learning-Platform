package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.StudySession
import com.example.smartenglish.util.ApiResult

interface StudyRepository {
    suspend fun getStudySessionsBySet(setId: String): ApiResult<List<StudySession>>
    suspend fun getAllStudySessions(): ApiResult<List<StudySession>>
    suspend fun createStudySession(setId: String): ApiResult<StudySession>
    suspend fun updateStudySession(id: String, cardsStudied: Int, correctCount: Int, incorrectCount: Int, duration: Int): ApiResult<StudySession>
    suspend fun completeStudySession(id: String): ApiResult<StudySession>
}
