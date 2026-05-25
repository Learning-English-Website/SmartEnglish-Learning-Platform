package com.example.smartenglish.data.remote.api

import com.example.smartenglish.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface SetApi {

    @GET("flashcard-sets/my")
    suspend fun getSets(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("q") query: String? = null,
        @Query("subject") subject: String? = null,
        @Query("tags") tags: String? = null
    ): Response<ApiListResponse<FlashcardSetDto>>

    @GET("flashcard-sets/{id}")
    suspend fun getSetById(@Path("id") id: String): Response<ApiResponse<FlashcardSetDto>>

    @POST("flashcard-sets")
    suspend fun createSet(@Body request: CreateSetRequest): Response<ApiResponse<FlashcardSetDto>>

    @PUT("flashcard-sets/{id}")
    suspend fun updateSet(
        @Path("id") id: String,
        @Body request: UpdateSetRequest
    ): Response<ApiResponse<FlashcardSetDto>>

    @DELETE("flashcard-sets/{id}")
    suspend fun deleteSet(@Path("id") id: String): Response<ApiResponse<Any?>>

    @GET("flashcard-sets/public")
    suspend fun getPublicSets(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("q") query: String? = null,
        @Query("subject") subject: String? = null,
        @Query("tags") tags: String? = null
    ): Response<ApiListResponse<FlashcardSetDto>>
}

interface CardApi {

    @GET("flashcards/set/{setId}")
    suspend fun getCardsBySet(
        @Path("setId") setId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ApiListResponse<FlashcardDto>>

    @GET("flashcards/{id}")
    suspend fun getCardById(@Path("id") id: String): Response<ApiResponse<FlashcardDto>>

    @POST("flashcards/set/{setId}")
    suspend fun createCard(@Path("setId") setId: String, @Body request: CreateCardRequest): Response<ApiResponse<FlashcardDto>>

    @PUT("flashcards/{id}")
    suspend fun updateCard(
        @Path("id") id: String,
        @Body request: UpdateCardRequest
    ): Response<ApiResponse<FlashcardDto>>

    @DELETE("flashcards/{id}")
    suspend fun deleteCard(@Path("id") id: String): Response<ApiResponse<Any?>>

    @GET("flashcards/search")
    suspend fun searchCards(
        @Query("q") query: String,
        @Query("setId") setId: String? = null
    ): Response<ApiListResponse<FlashcardDto>>
}

interface StudyApi {

    @GET("study-sessions")
    suspend fun getStudySessionsBySet(
        @Query("setId") setId: String? = null
    ): Response<ApiListResponse<StudySessionDto>>

    @GET("study-sessions/all")
    suspend fun getAllStudySessions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiListResponse<StudySessionDto>>

    @POST("study-sessions/start")
    suspend fun createStudySession(
        @Body request: CreateStudySessionRequest
    ): Response<ApiResponse<StudySessionDto>>

    @POST("study-sessions/{id}/answer")
    suspend fun submitAnswer(
        @Path("id") id: String,
        @Body request: UpdateStudySessionRequest
    ): Response<ApiResponse<StudySessionDto>>

    @POST("study-sessions/{id}/complete")
    suspend fun completeSession(
        @Path("id") id: String
    ): Response<ApiResponse<StudySessionDto>>

    @GET("study-sessions/{id}")
    suspend fun getStudySessionById(
        @Path("id") id: String
    ): Response<ApiResponse<StudySessionDto>>
}

interface ShareApi {

    @GET("shares/shared/{shareCode}")
    suspend fun getSharedSet(
        @Path("shareCode") shareCode: String
    ): Response<ApiResponse<FlashcardSetDto>>

    @POST("shares")
    suspend fun createShare(
        @Body request: CreateShareRequest
    ): Response<ApiResponse<ShareDto>>

    @DELETE("shares/{id}")
    suspend fun deleteShare(
        @Path("id") id: String
    ): Response<ApiResponse<Any?>>

    @GET("shares")
    suspend fun getUserShares(): Response<ApiListResponse<ShareDto>>
}

interface TagApi {

    @GET("tags/public")
    suspend fun getPublicTags(): Response<ApiListResponse<TagDto>>
}
