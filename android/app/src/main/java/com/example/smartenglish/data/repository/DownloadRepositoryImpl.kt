package com.example.smartenglish.data.repository

import com.example.smartenglish.data.local.dao.DownloadedContentDao
import com.example.smartenglish.data.local.dao.PendingOperationDao
import com.example.smartenglish.data.local.entity.DownloadedContentEntity
import com.example.smartenglish.domain.model.DownloadedContent
import com.example.smartenglish.domain.repository.DownloadRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DownloadRepositoryImpl @Inject constructor(
    private val downloadedContentDao: DownloadedContentDao,
    private val pendingOperationDao: PendingOperationDao
) : DownloadRepository {

    override fun getDownloadedContent(): Flow<List<DownloadedContent>> {
        return downloadedContentDao.getAllDownloaded().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getTotalDownloadedSize(): Flow<Long> {
        return downloadedContentDao.getTotalDownloadedSize().map { it ?: 0L }
    }

    override fun getPendingSyncCount(): Flow<Int> {
        return pendingOperationDao.getPendingCount()
    }

    private fun DownloadedContentEntity.toDomain() = DownloadedContent(
        contentId = contentId,
        contentType = contentType,
        title = title,
        cardCount = cardCount,
        downloadedAt = downloadedAt,
        sizeBytes = sizeBytes,
        mediaIncluded = mediaIncluded
    )
}
