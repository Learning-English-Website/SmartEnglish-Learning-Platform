package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    @Json(name = "success") val success: Boolean,
    @Json(name = "data") val data: T?,
    @Json(name = "error") val error: ErrorDto?
)

@JsonClass(generateAdapter = true)
data class ErrorDto(
    @Json(name = "code") val code: String?,
    @Json(name = "message") val message: String?
)
