package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_operations")
data class PendingOperationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String,   // "set", "card", "folder"
    val entityId: String,
    val operation: String,     // "create", "update", "delete"
    val payload: String,      // JSON serialized payload
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0
)
