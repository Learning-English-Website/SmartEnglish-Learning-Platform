package com.example.smartenglish.presentation.downloaded

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.data.sync.SyncManager
import com.example.smartenglish.data.sync.SyncScheduler
import com.example.smartenglish.domain.model.DownloadedContent
import com.example.smartenglish.domain.repository.DownloadRepository
import com.example.smartenglish.util.NetworkMonitor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DownloadViewModel @Inject constructor(
    private val downloadRepository: DownloadRepository,
    private val syncManager: SyncManager,
    private val syncScheduler: SyncScheduler,
    private val networkMonitor: NetworkMonitor,
    private val settingsRepository: com.example.smartenglish.data.repository.SettingsRepository
) : ViewModel() {

    val downloadedContent: StateFlow<List<DownloadedContent>> = downloadRepository
        .getDownloadedContent()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val totalSize: StateFlow<Long> = downloadRepository
        .getTotalDownloadedSize()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0L)

    val pendingCount: StateFlow<Int> = downloadRepository
        .getPendingSyncCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline

    val syncState: StateFlow<SyncManager.SyncState> = syncManager.syncState

    val lastSyncTime: StateFlow<Long> = syncManager.lastSyncTime

    val wifiOnlyEnabled: StateFlow<Boolean> = settingsRepository.wifiOnlyDownload

    fun syncNow() {
        syncScheduler.triggerImmediateSync()
        viewModelScope.launch {
            syncManager.processPendingOperations()
        }
    }

    fun setWifiOnly(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepository.setWifiOnlyDownload(enabled)
        }
    }

    fun removeDownload(contentId: String, contentType: String) {
        viewModelScope.launch {
            syncManager.removeDownload(contentId, contentType)
        }
    }
}
