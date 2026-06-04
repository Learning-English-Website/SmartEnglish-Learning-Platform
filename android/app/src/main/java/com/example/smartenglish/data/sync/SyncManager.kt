package com.example.smartenglish.data.sync

import android.app.Application
import android.util.Log
import com.example.smartenglish.data.local.dao.DownloadedContentDao
import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.dao.PendingOperationDao
import com.example.smartenglish.data.local.entity.DownloadedContentEntity
import com.example.smartenglish.data.local.entity.PendingOperationEntity
import com.example.smartenglish.data.remote.api.CardApi
import com.example.smartenglish.data.remote.api.FolderApi
import com.example.smartenglish.data.remote.api.SetApi
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.SyncStatus
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.util.NetworkMonitor
import com.squareup.moshi.Moshi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import javax.inject.Named
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay

@Singleton
class SyncManager @Inject constructor(
    private val pendingOperationDao: PendingOperationDao,
    private val flashcardSetDao: FlashcardSetDao,
    private val flashcardDao: FlashcardDao,
    private val downloadedContentDao: DownloadedContentDao,
    private val networkMonitor: NetworkMonitor,
    private val setApi: SetApi,
    private val cardApi: CardApi,
    private val folderApi: FolderApi,
    private val moshi: Moshi,
    @ApplicationContext private val applicationContext: android.content.Context,
    @Named("IO") private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val syncMutex = Mutex()
    private val syncRequests = Channel<Unit>(Channel.CONFLATED)

    private val mediaBaseDir: File by lazy {
        File(applicationContext.filesDir, "offline_media").also { it.mkdirs() }
    }
    companion object {
        private const val TAG = "SyncManager"
    }

    private val sharedPrefs by lazy {
        applicationContext.getSharedPreferences("sync_prefs", android.content.Context.MODE_PRIVATE)
    }

    private val _lastSyncTime = MutableStateFlow(sharedPrefs.getLong("last_sync_time", 0L))
    val lastSyncTime: StateFlow<Long> = _lastSyncTime.asStateFlow()

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState: StateFlow<SyncState> = _syncState.asStateFlow()

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount.asStateFlow()

    init {
        // Consumer loop for debounced synchronization requests
        kotlinx.coroutines.CoroutineScope(dispatcher).launch {
            for (request in syncRequests) {
                delay(1000) // Debounce rapid writes
                // Conflate all pending requests received during the delay
                while (syncRequests.tryReceive().isSuccess) { /* no-op */ }
                
                if (networkMonitor.isOnline.value) {
                    processPendingOperations()
                }
            }
        }

        kotlinx.coroutines.CoroutineScope(dispatcher).launch {
            // Khôi phục mốc thời gian đồng bộ từ DB nếu SharedPreferences trống
            try {
                val persisted = sharedPrefs.getLong("last_sync_time", 0L)
                if (persisted == 0L) {
                    val list = downloadedContentDao.getAllDownloaded().first()
                    val latestDownload = list.maxByOrNull { it.downloadedAt }?.downloadedAt ?: 0L
                    if (latestDownload > 0L) {
                        sharedPrefs.edit().putLong("last_sync_time", latestDownload).apply()
                        _lastSyncTime.value = latestDownload
                    }
                }
            } catch (_: Exception) {}

            // Đồng bộ ngay khi khởi động nếu đang online (Thêm jitter ngẫu nhiên 0.2s - 3s)
            if (networkMonitor.isOnline.value) {
                val jitterMs = kotlin.random.Random.nextLong(200, 3000)
                delay(jitterMs)
                triggerSync()
            }

            // Đồng bộ tự động ngay khi thiết bị chuyển từ mất mạng sang có mạng
            var wasOffline = false
            networkMonitor.isOnline.collect { online ->
                if (online && wasOffline) {
                    Log.d(TAG, "Network restored. Auto-syncing pending operations...")
                    // Thêm jitter ngẫu nhiên từ 1s đến 8s để tránh thundering herd làm sập server
                    val jitterMs = kotlin.random.Random.nextLong(1000, 8000)
                    delay(jitterMs)
                    triggerSync()
                }
                wasOffline = !online
            }
        }
    }

    fun triggerSync() {
        syncRequests.trySend(Unit)
    }

    suspend fun refreshPendingCount() {
        pendingOperationDao.getAllPending().let { ops ->
            _pendingCount.value = ops.size
        }
    }

    suspend fun hasPendingOperations(): Boolean = withContext(dispatcher) {
        pendingOperationDao.getAllPending().isNotEmpty()
    }

    private suspend fun compactPendingQueue() = withContext(dispatcher) {
        val allOps = pendingOperationDao.getAllPending()
        val toDelete = mutableListOf<Long>()

        for (op in allOps) {
            if (op.operation == "delete") {
                val createOp = allOps.find {
                    it.entityId == op.entityId &&
                    it.entityType == op.entityType &&
                    it.operation == "create" &&
                    it.createdAt < op.createdAt
                }
                if (createOp != null) {
                    toDelete.add(createOp.id)
                    toDelete.add(op.id)
                }
            }
        }

        val updatesByEntity = allOps
            .filter { it.operation == "update" && it.id !in toDelete }
            .groupBy { "${it.entityType}_${it.entityId}" }

        for ((_, ops) in updatesByEntity) {
            if (ops.size > 1) {
                val sorted = ops.sortedBy { it.createdAt }
                toDelete.addAll(sorted.dropLast(1).map { it.id })
            }
        }

        if (toDelete.isNotEmpty()) {
            pendingOperationDao.deleteByIds(toDelete)
            Log.d(TAG, "Queue compaction: removed ${toDelete.size} redundant operations")
        }
    }

    suspend fun processPendingOperations(): Result<Int> = withContext(dispatcher) {
        syncMutex.withLock {
            if (!networkMonitor.isOnline.value) {
                return@withContext Result.failure(Exception("No network"))
            }

            // Quick early exit if the queue has already been cleared
            if (pendingOperationDao.getAllPending().isEmpty()) {
                return@withContext Result.success(0)
            }

            _syncState.value = SyncState.Syncing
            compactPendingQueue()

            val allOps = pendingOperationDao.getAllPending()
            var successCount = 0
            var failCount = 0

            for (op in allOps) {
                try {
                    val result = executeOperation(op)
                    if (result.isSuccess) {
                        pendingOperationDao.deleteById(op.id)
                        successCount++
                    } else {
                        pendingOperationDao.incrementRetry(op.id)
                        failCount++
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "executeOperation failed: ${e.message}")
                    pendingOperationDao.incrementRetry(op.id)
                    failCount++
                }
            }

            pendingOperationDao.deleteFailed(5)
            refreshPendingCount()

            val isSuccess = failCount == 0
            if (isSuccess) {
                val now = System.currentTimeMillis()
                sharedPrefs.edit().putLong("last_sync_time", now).apply()
                _lastSyncTime.value = now
            }

            _syncState.value = if (isSuccess) SyncState.Success else SyncState.PartialSuccess(failCount)
            Result.success(successCount)
        }
    }


    private suspend fun executeOperation(op: PendingOperationEntity): Result<Unit> {
        return when (op.operation) {
            "create" -> executeCreate(op)
            "update" -> executeUpdate(op)
            "delete" -> executeDelete(op)
            else -> Result.failure(IllegalArgumentException("Unknown operation: ${op.operation}"))
        }
    }

    private suspend fun executeCreate(op: PendingOperationEntity): Result<Unit> = withContext(dispatcher) {
        try {
            when (op.entityType) {
                "set" -> {
                    val adapter = moshi.adapter(SetCreatePayload::class.java)
                    val payload = adapter.fromJson(op.payload) ?: return@withContext Result.failure(Exception("Invalid payload"))
                    val response = setApi.createSet(
                        com.example.smartenglish.data.remote.dto.CreateSetRequest(
                            title = payload.title,
                            description = payload.description,
                            language = payload.language ?: "English",
                            isPublic = payload.isPublic,
                            tags = payload.tags
                        )
                    )
                    if (response.isSuccessful && response.body()?.success == true) {
                        val serverId = response.body()?.data?.id
                        if (serverId != null && serverId != op.entityId) {
                            flashcardSetDao.updateSyncStatus(serverId, SyncStatus.SYNCED.name)
                        }
                        Result.success(Unit)
                    } else {
                        Result.failure(Exception("Create set failed"))
                    }
                }
                "card" -> {
                    val adapter = moshi.adapter(CardCreatePayload::class.java)
                    val payload = adapter.fromJson(op.payload) ?: return@withContext Result.failure(Exception("Invalid payload"))
                    val response = cardApi.createCard(
                        payload.setId,
                        com.example.smartenglish.data.remote.dto.CreateCardRequest(
                            front = payload.front,
                            back = payload.back,
                            pronunciation = payload.pronunciation,
                            example = payload.example,
                            note = payload.note,
                            collocation = payload.collocation,
                            relatedWords = payload.relatedWords,
                            imageUrl = payload.imageUrl
                        )
                    )
                    if (response.isSuccessful && response.body()?.success == true) {
                        val serverCardDto = response.body()?.data
                        if (serverCardDto != null) {
                            flashcardDao.deleteCard(op.entityId)
                            val serverCard = serverCardDto.toDomain()
                            flashcardDao.insertCard(com.example.smartenglish.data.local.entity.FlashcardEntity.fromDomain(serverCard))
                        }
                        Result.success(Unit)
                    } else {
                        Result.failure(Exception("Create card failed"))
                    }
                }
                else -> Result.failure(Exception("Unknown entity type"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "executeCreate error: ${e.message}")
            Result.failure(e)
        }
    }

    private suspend fun executeUpdate(op: PendingOperationEntity): Result<Unit> = withContext(dispatcher) {
        try {
            when (op.entityType) {
                "set" -> {
                    val adapter = moshi.adapter(SetUpdatePayload::class.java)
                    val payload = adapter.fromJson(op.payload) ?: return@withContext Result.failure(Exception("Invalid payload"))
                    val response = setApi.updateSet(
                        op.entityId,
                        com.example.smartenglish.data.remote.dto.UpdateSetRequest(
                            title = payload.title,
                            description = payload.description,
                            language = payload.language,
                            isPublic = payload.isPublic,
                            tags = payload.tags
                        )
                    )
                    if (response.isSuccessful && response.body()?.success == true) {
                        flashcardSetDao.updateSyncStatus(op.entityId, SyncStatus.SYNCED.name)
                        Result.success(Unit)
                    } else {
                        Result.failure(Exception("Update set failed"))
                    }
                }
                "card" -> {
                    val adapter = moshi.adapter(CardUpdatePayload::class.java)
                    val payload = adapter.fromJson(op.payload) ?: return@withContext Result.failure(Exception("Invalid payload"))
                    val response = cardApi.updateCard(
                        op.entityId,
                        com.example.smartenglish.data.remote.dto.UpdateCardRequest(
                            front = payload.front,
                            back = payload.back,
                            pronunciation = payload.pronunciation,
                            example = payload.example,
                            note = payload.note,
                            collocation = payload.collocation,
                            relatedWords = payload.relatedWords,
                            imageUrl = payload.imageUrl
                        )
                    )
                    if (response.isSuccessful && response.body()?.success == true) {
                        Result.success(Unit)
                    } else {
                        Result.failure(Exception("Update card failed"))
                    }
                }
                else -> Result.failure(Exception("Unknown entity type"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "executeUpdate error: ${e.message}")
            Result.failure(e)
        }
    }

    private suspend fun executeDelete(op: PendingOperationEntity): Result<Unit> = withContext(dispatcher) {
        try {
            when (op.entityType) {
                "set" -> {
                    val response = setApi.deleteSet(op.entityId)
                    if ((response.isSuccessful && response.body()?.success == true) || response.code() == 404) {
                        flashcardSetDao.deleteSet(op.entityId)
                        Result.success(Unit)
                    } else {
                        Result.failure(Exception("Delete set failed"))
                    }
                }
                "card" -> {
                    val response = cardApi.deleteCard(op.entityId)
                    if ((response.isSuccessful && response.body()?.success == true) || response.code() == 404) {
                        Result.success(Unit)
                    } else {
                        Result.failure(Exception("Delete card failed"))
                    }
                }
                else -> Result.failure(Exception("Unknown entity type"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "executeDelete error: ${e.message}")
            Result.failure(e)
        }
    }

    suspend fun deleteSetCascade(setId: String, online: Boolean = networkMonitor.isOnline.value) = withContext(dispatcher) {
        flashcardDao.deleteCardsBySet(setId)
        val setDir = File(mediaBaseDir, setId)
        if (setDir.exists()) setDir.deleteRecursively()
        downloadedContentDao.deleteById(setId)

        if (online) {
            try {
                val response = setApi.deleteSet(setId)
                if (response.isSuccessful && response.body()?.success == true) {
                    flashcardSetDao.deleteSet(setId)
                }
            } catch (e: Exception) {
                queueOperation("set", setId, "delete", "{}")
            }
        } else {
            queueOperation("set", setId, "delete", "{}")
            flashcardSetDao.updateSyncStatus(setId, SyncStatus.DELETED.name)
        }
    }

    suspend fun downloadSet(
        setId: String,
        includeMedia: Boolean = true,
        wifiRequired: Boolean = false
    ): Result<Unit> = withContext(dispatcher) {
        if (!networkMonitor.isOnline.value) {
            return@withContext Result.failure(Exception("No network"))
        }

        if (wifiRequired && networkMonitor.connectionType.value != NetworkMonitor.ConnectionType.WIFI) {
            return@withContext Result.failure(Exception("WiFi required for download"))
        }

        _syncState.value = SyncState.Downloading(setId)

        try {
            val setResponse = setApi.getSetById(setId)
            if (!setResponse.isSuccessful || setResponse.body()?.success != true) {
                _syncState.value = SyncState.Error("Failed to fetch set")
                return@withContext Result.failure(Exception("Failed to fetch set"))
            }

            val setData = setResponse.body()?.data ?: run {
                _syncState.value = SyncState.Error("No set data")
                return@withContext Result.failure(Exception("No set data"))
            }

            val set = setData.toDomain()

            val cardResponse = cardApi.getCardsBySet(setId)
            val cards = if (cardResponse.isSuccessful && cardResponse.body()?.success == true) {
                cardResponse.body()?.data?.map { it.toDomain() } ?: emptyList()
            } else emptyList()

            val entity = com.example.smartenglish.data.local.entity.FlashcardSetEntity.fromDomain(set).copy(
                isDownloaded = true,
                downloadedAt = System.currentTimeMillis(),
                syncStatus = SyncStatus.SYNCED.name
            )
            flashcardSetDao.insertOrUpdate(entity)

            val cardEntities = cards.map {
                com.example.smartenglish.data.local.entity.FlashcardEntity.fromDomain(it)
            }
            flashcardDao.insertCards(cardEntities)

            var totalMediaSize = 0L
            if (includeMedia) {
                totalMediaSize = downloadMediaForSet(setId, cards)
            }
            if (totalMediaSize == 0L) {
                // Estimate a realistic baseline text database footprint (1KB base + 512B per card) so size is never 0 B
                totalMediaSize = 1024L + (cards.size * 512L)
            }

            downloadedContentDao.insert(DownloadedContentEntity(
                contentId = setId,
                contentType = "set",
                title = set.title,
                cardCount = cards.size,
                downloadedAt = System.currentTimeMillis(),
                sizeBytes = totalMediaSize,
                mediaIncluded = includeMedia
            ))

            flashcardSetDao.updateDownloadStatus(setId, true, System.currentTimeMillis())

            val now = System.currentTimeMillis()
            sharedPrefs.edit().putLong("last_sync_time", now).apply()
            _lastSyncTime.value = now

            _syncState.value = SyncState.Success
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "downloadSet error: ${e.message}")
            _syncState.value = SyncState.Error(e.message ?: "Download failed")
            Result.failure(e)
        }
    }

    private suspend fun downloadMediaForSet(setId: String, cards: List<Flashcard>): Long = withContext(dispatcher) {
        var totalSize = 0L
        val mediaDir = File(mediaBaseDir, setId)
        mediaDir.mkdirs()

        val httpClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

        for (card in cards) {
            card.imageUrl?.takeIf { it.isNotBlank() }?.let { url ->
                try {
                    val request = Request.Builder().url(url).build()
                    val response = httpClient.newCall(request).execute()
                    if (response.isSuccessful) {
                        val extension = url.substringAfterLast(".", "jpg").take(4)
                        val file = File(mediaDir, "img_${card.id}.${extension}")
                        response.body?.byteStream()?.use { input ->
                            file.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                        totalSize += file.length()
                        flashcardDao.updateLocalMediaPaths(card.id, file.absolutePath, null)
                    }
                } catch (_: Exception) { }
            }

            card.pronunciation?.takeIf { it.isNotBlank() }?.let { url ->
                try {
                    val request = Request.Builder().url(url).build()
                    val response = httpClient.newCall(request).execute()
                    if (response.isSuccessful) {
                        val extension = url.substringAfterLast(".", "mp3").take(4)
                        val file = File(mediaDir, "audio_${card.id}.${extension}")
                        response.body?.byteStream()?.use { input ->
                            file.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                        totalSize += file.length()
                        flashcardDao.updateLocalMediaPaths(card.id, null, file.absolutePath)
                    }
                } catch (_: Exception) { }
            }
        }

        totalSize
    }

    suspend fun downloadFolder(
        folderId: String,
        includeMedia: Boolean = true,
        wifiRequired: Boolean = false
    ): Result<Unit> = withContext(dispatcher) {
        if (!networkMonitor.isOnline.value) {
            return@withContext Result.failure(Exception("No network"))
        }

        if (wifiRequired && networkMonitor.connectionType.value != NetworkMonitor.ConnectionType.WIFI) {
            return@withContext Result.failure(Exception("WiFi required for download"))
        }

        _syncState.value = SyncState.Downloading(folderId)

        try {
            val folderResponse = folderApi.getFolderById(folderId)
            if (!folderResponse.isSuccessful || folderResponse.body()?.success != true) {
                _syncState.value = SyncState.Error("Failed to fetch folder")
                return@withContext Result.failure(Exception("Failed to fetch folder"))
            }

            val folderSetsResponse = folderApi.getFolderSets(folderId)
            val folderSets = if (folderSetsResponse.isSuccessful && folderSetsResponse.body()?.success == true) {
                folderSetsResponse.body()?.data?.sets?.map { it.toDomain() } ?: emptyList()
            } else emptyList()

            var totalCards = 0
            var totalMediaSize = 0L

            for (set in folderSets) {
                val entity = com.example.smartenglish.data.local.entity.FlashcardSetEntity.fromDomain(set).copy(
                    isDownloaded = true,
                    downloadedAt = System.currentTimeMillis(),
                    syncStatus = SyncStatus.SYNCED.name
                )
                flashcardSetDao.insertOrUpdate(entity)

                val cardResponse = cardApi.getCardsBySet(set.id)
                val cards = if (cardResponse.isSuccessful && cardResponse.body()?.success == true) {
                    cardResponse.body()?.data?.map { it.toDomain() } ?: emptyList()
                } else emptyList()

                val cardEntities = cards.map {
                    com.example.smartenglish.data.local.entity.FlashcardEntity.fromDomain(it)
                }
                flashcardDao.insertCards(cardEntities)
                totalCards += cards.size

                if (includeMedia) {
                    totalMediaSize += downloadMediaForSet(set.id, cards)
                }

                flashcardSetDao.updateDownloadStatus(set.id, true, System.currentTimeMillis())
            }

            if (totalMediaSize == 0L) {
                // Estimate a realistic baseline text database footprint (2KB base + 512B per card) so size is never 0 B
                totalMediaSize = 2048L + (totalCards * 512L)
            }

            val folderName = folderSets.firstOrNull()?.title ?: "Folder"

            downloadedContentDao.insert(DownloadedContentEntity(
                contentId = folderId,
                contentType = "folder",
                title = folderName,
                cardCount = totalCards,
                downloadedAt = System.currentTimeMillis(),
                sizeBytes = totalMediaSize,
                mediaIncluded = includeMedia
            ))

            val now = System.currentTimeMillis()
            sharedPrefs.edit().putLong("last_sync_time", now).apply()
            _lastSyncTime.value = now

            _syncState.value = SyncState.Success
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "downloadFolder error: ${e.message}")
            _syncState.value = SyncState.Error(e.message ?: "Download failed")
            Result.failure(e)
        }
    }

    suspend fun removeDownload(contentId: String, contentType: String) = withContext(dispatcher) {
        when (contentType) {
            "set" -> {
                flashcardSetDao.updateDownloadStatus(contentId, false, null)
                flashcardSetDao.updateLocalMediaPath(contentId, null)
                val mediaDir = File(mediaBaseDir, contentId)
                if (mediaDir.exists()) mediaDir.deleteRecursively()
            }
            "folder" -> {
                val sets = flashcardSetDao.getDownloadedSetsList().filter { it.id == contentId }
                for (set in sets) {
                    flashcardSetDao.updateDownloadStatus(set.id, false, null)
                    val mediaDir = File(mediaBaseDir, set.id)
                    if (mediaDir.exists()) mediaDir.deleteRecursively()
                }
            }
        }
        downloadedContentDao.deleteById(contentId)
    }

    suspend fun queueOperation(entityType: String, entityId: String, operation: String, payload: String) {
        val existingOps = pendingOperationDao.getOperationsByEntity(entityId, entityType)

        if (operation == "delete") {
            val createOp = existingOps.find { it.operation == "create" }
            if (createOp != null) {
                pendingOperationDao.deleteById(createOp.id)
            }
        }

        if (operation == "create" && existingOps.any { it.operation == "create" }) {
            return
        }

        if (existingOps.any { it.operation == operation }) {
            return
        }

        pendingOperationDao.insert(
            PendingOperationEntity(
                entityType = entityType,
                entityId = entityId,
                operation = operation,
                payload = payload,
                createdAt = System.currentTimeMillis(),
                retryCount = 0
            )
        )
        refreshPendingCount()

        // Tự động đồng bộ ngay lập tức nếu thiết bị đang trực tuyến
        if (networkMonitor.isOnline.value) {
            triggerSync()
        }
    }

    suspend fun updateDownloadedSetSizeAndCount(setId: String) = withContext(dispatcher) {
        val entity = downloadedContentDao.getById(setId) ?: return@withContext
        val setDir = File(mediaBaseDir, setId)
        val mediaSize = if (setDir.exists()) {
            setDir.listFiles()?.sumOf { it.length() } ?: 0L
        } else 0L

        val cardsCount = flashcardDao.getCardsBySetList(setId).size
        val estimatedDbSize = 1024L + (cardsCount * 512L)

        val updatedEntity = entity.copy(
            cardCount = cardsCount,
            sizeBytes = mediaSize + estimatedDbSize
        )
        downloadedContentDao.insert(updatedEntity)
    }

    suspend fun downloadMediaForCard(setId: String, card: Flashcard) = withContext(dispatcher) {
        val set = flashcardSetDao.getSetById(setId)
        if (set == null || !set.isDownloaded) return@withContext

        val mediaDir = File(mediaBaseDir, setId)
        mediaDir.mkdirs()

        val httpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        var localImagePath: String? = null
        var localAudioPath: String? = null

        card.imageUrl?.takeIf { it.isNotBlank() }?.let { url ->
            try {
                val request = Request.Builder().url(url).build()
                val response = httpClient.newCall(request).execute()
                if (response.isSuccessful) {
                    val extension = url.substringAfterLast(".", "jpg").take(4)
                    val file = File(mediaDir, "img_${card.id}.${extension}")
                    response.body?.byteStream()?.use { input ->
                        file.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    localImagePath = file.absolutePath
                }
            } catch (_: Exception) { }
        }

        card.pronunciation?.takeIf { it.isNotBlank() }?.let { url ->
            try {
                val request = Request.Builder().url(url).build()
                val response = httpClient.newCall(request).execute()
                if (response.isSuccessful) {
                    val extension = url.substringAfterLast(".", "mp3").take(4)
                    val file = File(mediaDir, "audio_${card.id}.${extension}")
                    response.body?.byteStream()?.use { input ->
                        file.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    localAudioPath = file.absolutePath
                }
            } catch (_: Exception) { }
        }

        if (localImagePath != null || localAudioPath != null) {
            flashcardDao.updateLocalMediaPaths(card.id, localImagePath, localAudioPath)
        }

        updateDownloadedSetSizeAndCount(setId)
    }

    suspend fun cancelPendingCreate(entityType: String, entityId: String) = withContext(dispatcher) {
        pendingOperationDao.deleteByEntityAndOp(entityId, entityType, "create")
        refreshPendingCount()
    }

    fun resetSyncState() {
        _syncState.value = SyncState.Idle
    }

    sealed class SyncState {
        data object Idle : SyncState()
        data object Syncing : SyncState()
        data class Downloading(val contentId: String) : SyncState()
        data object Success : SyncState()
        data class PartialSuccess(val failCount: Int) : SyncState()
        data class Error(val message: String) : SyncState()
    }
}

data class SetCreatePayload(val title: String, val description: String?, val language: String?, val isPublic: Boolean, val tags: List<String>)
data class SetUpdatePayload(val title: String?, val description: String?, val language: String?, val isPublic: Boolean?, val tags: List<String>?)
data class CardCreatePayload(val setId: String, val front: String, val back: String, val pronunciation: String?, val example: String?, val note: String?, val collocation: String?, val relatedWords: String?, val imageUrl: String?)
data class CardUpdatePayload(val front: String?, val back: String?, val pronunciation: String?, val example: String?, val note: String?, val collocation: String?, val relatedWords: String?, val imageUrl: String?)
