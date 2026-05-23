package com.example.smartenglish.domain.model

data class User(
    val id: String,
    val email: String,
    val username: String,
    val role: String,
    val avatar: String?,
    val premium: String,
    val createdAt: String?
)

fun com.example.smartenglish.data.remote.dto.UserDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        username = username,
        role = role,
        avatar = avatar,
        premium = premium,
        createdAt = createdAt
    )
}
