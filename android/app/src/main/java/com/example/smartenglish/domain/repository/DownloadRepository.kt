package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.DownloadedContent
import kotlinx.coroutines.flow.Flow

interface DownloadRepository {
    fun getDownloadedContent(): Flow<List<DownloadedContent>>
    fun getTotalDownloadedSize(): Flow<Long>
    fun getPendingSyncCount(): Flow<Int>
}
