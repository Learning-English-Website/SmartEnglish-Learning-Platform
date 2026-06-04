package com.example.smartenglish.data.remote.api

import com.example.smartenglish.data.remote.dto.AdminUserListDto
import com.example.smartenglish.data.remote.dto.ApiResponse
import com.example.smartenglish.data.remote.dto.UpdateAdminUserRequest
import com.example.smartenglish.data.remote.dto.UpdateUserRoleRequest
import com.example.smartenglish.data.remote.dto.UserDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface AdminApi {

    @GET("admin/users")
    suspend fun getUsers(
        @Query("search") search: String? = null,
        @Query("role") role: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10
    ): Response<ApiResponse<AdminUserListDto>>

    @GET("admin/users/{id}")
    suspend fun getUserById(
        @Path("id") userId: String
    ): Response<ApiResponse<UserDto>>

    @PUT("admin/users/{id}")
    suspend fun updateUser(
        @Path("id") userId: String,
        @Body body: UpdateAdminUserRequest
    ): Response<ApiResponse<UserDto>>

    @PUT("admin/users/{id}/role")
    suspend fun updateUserRole(
        @Path("id") userId: String,
        @Body body: UpdateUserRoleRequest
    ): Response<ApiResponse<UserDto>>

    @DELETE("admin/users/{id}")
    suspend fun deleteUser(
        @Path("id") userId: String
    ): Response<Unit>
}
