package com.example.smartenglish.util

sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val code: Int? = null) : ApiResult<Nothing>()
    data object Loading : ApiResult<Nothing>()
    data class EmailVerificationRequired(val email: String) : ApiResult<Nothing>()
}
