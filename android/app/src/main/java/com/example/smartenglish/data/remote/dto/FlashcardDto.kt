package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class FlashcardSetDto(
    @Json(name = "_id") val id: String,
    @Json(name = "title") val title: String,
    @Json(name = "description") val description: String? = null,
    @Json(name = "subject") val subject: String? = null,
    @Json(name = "gradeLevel") val gradeLevel: String? = null,
    @Json(name = "language") val language: String? = null,
    @Json(name = "isPublic") val isPublic: Boolean = false,
    @Json(name = "shareCode") val shareCode: String? = null,
    @Json(name = "cardCount") val cardCount: Int = 0,
    @Json(name = "user") val user: Any? = null,
    @Json(name = "tags") val tags: List<Any> = emptyList(),
    @Json(name = "tagObjects") val tagObjects: List<TagDto> = emptyList(),
    @Json(name = "createdAt") val createdAt: String?,
    @Json(name = "updatedAt") val updatedAt: String?
) {
    // Helper to get user ID whether user is a string or object
    val userId: String?
        get() = when (user) {
            is String -> user
            is Map<*, *> -> (user as Map<*, *>)["_id"] as? String
            is UserSimpleDto -> user.id
            else -> null
        }

    val userName: String?
        get() = when (user) {
            is Map<*, *> -> (user as Map<*, *>)["username"] as? String
            is UserSimpleDto -> user.username
            else -> null
        }
}

@JsonClass(generateAdapter = true)
data class UserSimpleDto(
    @Json(name = "_id") val id: String,
    @Json(name = "username") val username: String?,
    @Json(name = "avatar") val avatar: String?
)

@JsonClass(generateAdapter = true)
data class CreateSetRequest(
    @Json(name = "title") val title: String,
    @Json(name = "description") val description: String? = null,
    @Json(name = "language") val language: String? = null,
    @Json(name = "isPublic") val isPublic: Boolean = false,
    @Json(name = "tags") val tags: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class UpdateSetRequest(
    @Json(name = "title") val title: String? = null,
    @Json(name = "description") val description: String? = null,
    @Json(name = "language") val language: String? = null,
    @Json(name = "isPublic") val isPublic: Boolean? = null,
    @Json(name = "tags") val tags: List<String>? = null
)

@JsonClass(generateAdapter = true)
data class FlashcardDto(
    @Json(name = "_id") val id: String,
    @Json(name = "set") val setId: String,
    @Json(name = "front") val front: String,
    @Json(name = "back") val back: String,
    @Json(name = "pronunciation") val pronunciation: String?,
    @Json(name = "example") val example: String?,
    @Json(name = "note") val note: String?,
    @Json(name = "collocation") val collocation: String? = null,
    @Json(name = "relatedWords") val relatedWords: String? = null,
    @Json(name = "imageUrl") val imageUrl: String?,
    @Json(name = "createdAt") val createdAt: String?,
    @Json(name = "updatedAt") val updatedAt: String?
)

@JsonClass(generateAdapter = true)
data class CreateCardRequest(
    @Json(name = "front") val front: String,
    @Json(name = "back") val back: String,
    @Json(name = "pronunciation") val pronunciation: String? = null,
    @Json(name = "example") val example: String? = null,
    @Json(name = "note") val note: String? = null,
    @Json(name = "collocation") val collocation: String? = null,
    @Json(name = "relatedWords") val relatedWords: String? = null,
    @Json(name = "imageUrl") val imageUrl: String? = null
)

@JsonClass(generateAdapter = true)
data class BulkCreateCardsRequest(
    @Json(name = "cards") val cards: List<CreateCardRequest>
)

@JsonClass(generateAdapter = true)
data class UpdateCardRequest(
    @Json(name = "front") val front: String?,
    @Json(name = "back") val back: String?,
    @Json(name = "pronunciation") val pronunciation: String?,
    @Json(name = "example") val example: String?,
    @Json(name = "note") val note: String?,
    @Json(name = "collocation") val collocation: String? = null,
    @Json(name = "relatedWords") val relatedWords: String? = null,
    @Json(name = "imageUrl") val imageUrl: String?
)

@JsonClass(generateAdapter = true)
data class StudySessionDto(
    @Json(name = "_id") val id: String,
    @Json(name = "userId") val userId: String,
    @Json(name = "setId") val setId: String,
    @Json(name = "setName") val setName: String? = null,
    @Json(name = "cardsStudied") val cardsStudied: Int = 0,
    @Json(name = "correctCount") val correctCount: Int = 0,
    @Json(name = "incorrectCount") val incorrectCount: Int = 0,
    @Json(name = "duration") val duration: Int = 0,
    @Json(name = "startedAt") val startedAt: String?,
    @Json(name = "completedAt") val completedAt: String?
)

@JsonClass(generateAdapter = true)
data class CreateStudySessionRequest(
    @Json(name = "setId") val setId: String
)

@JsonClass(generateAdapter = true)
data class UpdateStudySessionRequest(
    @Json(name = "cardsStudied") val cardsStudied: Int?,
    @Json(name = "correctCount") val correctCount: Int?,
    @Json(name = "incorrectCount") val incorrectCount: Int?,
    @Json(name = "duration") val duration: Int?
)

@JsonClass(generateAdapter = true)
data class ShareDto(
    @Json(name = "_id") val id: String,
    @Json(name = "setId") val setId: String,
    @Json(name = "shareCode") val shareCode: String,
    @Json(name = "isActive") val isActive: Boolean = true,
    @Json(name = "expiresAt") val expiresAt: String?,
    @Json(name = "createdAt") val createdAt: String?
)

@JsonClass(generateAdapter = true)
data class CreateShareRequest(
    @Json(name = "setId") val setId: String,
    @Json(name = "expiresIn") val expiresIn: Int? = null
)

@JsonClass(generateAdapter = true)
data class TagDto(
    @Json(name = "_id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "category") val category: String?,
    @Json(name = "count") val count: Int = 0
)

@JsonClass(generateAdapter = true)
data class SearchSetsRequest(
    @Json(name = "q") val query: String?,
    @Json(name = "subject") val subject: String?,
    @Json(name = "tags") val tags: List<String>?,
    @Json(name = "page") val page: Int = 1,
    @Json(name = "limit") val limit: Int = 20
)
