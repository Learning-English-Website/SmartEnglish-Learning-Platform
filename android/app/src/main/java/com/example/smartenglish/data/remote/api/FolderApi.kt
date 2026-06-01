package com.example.smartenglish.data.remote.api

import com.example.smartenglish.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface FolderApi {

    @GET("folders")
    suspend fun getFolders(): Response<ApiResponse<List<FolderDto>>>

    @GET("folders/{id}")
    suspend fun getFolderById(@Path("id") id: String): Response<ApiResponse<FolderDto>>

    @POST("folders")
    suspend fun createFolder(@Body request: CreateFolderRequest): Response<ApiResponse<FolderDto>>

    @PUT("folders/{id}")
    suspend fun updateFolder(
        @Path("id") id: String,
        @Body request: UpdateFolderRequest
    ): Response<ApiResponse<FolderDto>>

    @DELETE("folders/{id}")
    suspend fun deleteFolder(@Path("id") id: String): Response<ApiResponse<Any?>>

    @GET("folders/{id}/sets")
    suspend fun getFolderSets(@Path("id") id: String): Response<ApiResponse<FolderSetsResponse>>

    @POST("folders/{id}/sets")
    suspend fun addSetToFolder(
        @Path("id") id: String,
        @Body request: AddSetToFolderRequest
    ): Response<ApiResponse<FolderDto>>

    @DELETE("folders/{id}/sets/{setId}")
    suspend fun removeSetFromFolder(
        @Path("id") id: String,
        @Path("setId") setId: String
    ): Response<ApiResponse<FolderDto>>
}
