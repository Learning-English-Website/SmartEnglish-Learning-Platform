package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "email") val email: String,
    @Json(name = "password") val password: String
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    @Json(name = "email") val email: String,
    @Json(name = "username") val username: String,
    @Json(name = "password") val password: String
)

@JsonClass(generateAdapter = true)
data class RefreshRequest(
    @Json(name = "refreshToken") val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class ForgotPasswordRequest(
    @Json(name = "email") val email: String
)

@JsonClass(generateAdapter = true)
data class VerifyOtpRequest(
    @Json(name = "email") val email: String,
    @Json(name = "otp") val otp: String
)

@JsonClass(generateAdapter = true)
data class ResetPasswordRequest(
    @Json(name = "email") val email: String,
    @Json(name = "otp") val otp: String,
    @Json(name = "newPassword") val newPassword: String
)

@JsonClass(generateAdapter = true)
data class GoogleAuthRequest(
    @Json(name = "idToken") val idToken: String
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    @Json(name = "user") val user: UserDto? = null,
    @Json(name = "accessToken") val accessToken: String? = null,
    @Json(name = "refreshToken") val refreshToken: String? = null,
    @Json(name = "requiresEmailVerification") val requiresEmailVerification: Boolean? = null,
    @Json(name = "email") val email: String? = null
)

@JsonClass(generateAdapter = true)
data class UserDto(
    @Json(name = "_id") val id: String,
    @Json(name = "email") val email: String,
    @Json(name = "username") val username: String,
    @Json(name = "role") val role: String,
    @Json(name = "avatar") val avatar: String?,
    @Json(name = "premium") val premium: String,
    @Json(name = "isVerified") val isVerified: Boolean? = false,
    @Json(name = "streak") val streak: StreakDto? = null,
    @Json(name = "gamification") val gamification: GamificationDto? = null,
    @Json(name = "createdAt") val createdAt: String?,
    @Json(name = "updatedAt") val updatedAt: String?
)

@JsonClass(generateAdapter = true)
data class StreakDto(
    @Json(name = "current") val current: Int = 0,
    @Json(name = "longest") val longest: Int = 0,
    @Json(name = "lastStudyDate") val lastStudyDate: String? = null
)

@JsonClass(generateAdapter = true)
data class GamificationDto(
    @Json(name = "xp") val xp: Int = 0,
    @Json(name = "level") val level: Int = 1
)

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    @Json(name = "username") val username: String?,
    @Json(name = "avatar") val avatar: String?
)

@JsonClass(generateAdapter = true)
data class VerifyOtpResponse(
    @Json(name = "verified") val verified: Boolean = true
)

@JsonClass(generateAdapter = true)
data class MessageResponse(
    @Json(name = "message") val message: String
)
