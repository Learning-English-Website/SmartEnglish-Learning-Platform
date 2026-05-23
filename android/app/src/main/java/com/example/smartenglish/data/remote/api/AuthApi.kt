package com.example.smartenglish.data.remote.api

import com.example.smartenglish.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT

interface AuthApi {

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<ApiResponse<AuthResponse>>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiResponse<AuthResponse>>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): Response<ApiResponse<AuthResponse>>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<ApiResponse<MessageResponse>>

    @POST("auth/verify-reset-otp")
    suspend fun verifyResetOtp(@Body body: VerifyOtpRequest): Response<ApiResponse<MessageResponse>>

    @POST("auth/verify-email-otp")
    suspend fun verifyOtp(@Body body: VerifyOtpRequest): Response<ApiResponse<VerifyOtpResponse>>

    @POST("auth/reset-password-otp")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<ApiResponse<MessageResponse>>

    @POST("auth/logout")
    suspend fun logout(): Response<ApiResponse<Unit>>

    @GET("auth/me")
    suspend fun getMe(): Response<ApiResponse<UserDto>>
}

interface UserApi {

    @GET("users/me")
    suspend fun getMe(): Response<ApiResponse<UserDto>>

    @PUT("users/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): Response<ApiResponse<UserDto>>
}
