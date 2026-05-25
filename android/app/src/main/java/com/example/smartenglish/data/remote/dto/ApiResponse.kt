package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    @Json(name = "success") val success: Boolean,
    @Json(name = "message") val message: String? = null,
    @Json(name = "data") val data: T? = null,
    @Json(name = "error") val error: ErrorResponse? = null
)

@JsonClass(generateAdapter = true)
data class ApiListResponse<T>(
    @Json(name = "success") val success: Boolean,
    @Json(name = "message") val message: String? = null,
    @Json(name = "data") val data: List<T> = emptyList(),
    @Json(name = "pagination") val pagination: PaginationDto? = null,
    @Json(name = "error") val error: ErrorResponse? = null
)

@JsonClass(generateAdapter = true)
data class PaginationDto(
    @Json(name = "page") val page: Int,
    @Json(name = "limit") val limit: Int,
    @Json(name = "total") val total: Int,
    @Json(name = "pages") val pages: Int
)

@JsonClass(generateAdapter = true)
data class ErrorResponse(
    @Json(name = "message") val message: String,
    @Json(name = "code") val code: String? = null
)
