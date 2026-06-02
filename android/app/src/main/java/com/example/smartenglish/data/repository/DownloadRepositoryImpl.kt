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
        return downloadedContentDao.getAllDownloaded().map { entities ->
            entities.sumOf { entity ->
                var size = entity.sizeBytes
                if (size == 0L && entity.cardCount > 0) {
                    size = if (entity.contentType == "folder") {
                        2048L + (entity.cardCount * 512L)
                    } else {
                        1024L + (entity.cardCount * 512L)
                    }
                }
                size
            }
        }
    }

    override fun getPendingSyncCount(): Flow<Int> {
        return pendingOperationDao.getPendingCount()
    }

    private fun DownloadedContentEntity.toDomain(): DownloadedContent {
        var size = sizeBytes
        if (size == 0L && cardCount > 0) {
            size = if (contentType == "folder") {
                2048L + (cardCount * 512L)
            } else {
                1024L + (cardCount * 512L)
            }
        }
        return DownloadedContent(
            contentId = contentId,
            contentType = contentType,
            title = title,
            cardCount = cardCount,
            downloadedAt = downloadedAt,
            sizeBytes = size,
            mediaIncluded = mediaIncluded
        )
    }
}
