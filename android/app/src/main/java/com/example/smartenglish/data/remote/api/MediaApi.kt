package com.example.smartenglish.data.remote.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface MediaApi {
    @Multipart
    @POST("media/upload")
    suspend fun uploadImage(
        @Part image: MultipartBody.Part
    ): Response<MediaUploadResponse>
}

data class MediaUploadResponse(
    val success: Boolean,
    val message: String?,
    val url: String?
)
