package com.example.smartenglish.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

@Singleton
class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private val WIFI_ONLY_DOWNLOAD = booleanPreferencesKey("wifi_only_download")
        private val AUTO_SYNC_ENABLED = booleanPreferencesKey("auto_sync_enabled")
    }

    private val scope = CoroutineScope(Dispatchers.IO)

    private val _wifiOnlyDownload = MutableStateFlow(true)
    val wifiOnlyDownload: StateFlow<Boolean> = _wifiOnlyDownload.asStateFlow()

    private val _autoSyncEnabled = MutableStateFlow(true)
    val autoSyncEnabled: StateFlow<Boolean> = _autoSyncEnabled.asStateFlow()

    init {
        scope.launch {
            context.settingsDataStore.data.map { prefs ->
                prefs[WIFI_ONLY_DOWNLOAD] ?: true
            }.collect {
                _wifiOnlyDownload.value = it
            }
        }
        scope.launch {
            context.settingsDataStore.data.map { prefs ->
                prefs[AUTO_SYNC_ENABLED] ?: true
            }.collect {
                _autoSyncEnabled.value = it
            }
        }
    }

    suspend fun setWifiOnlyDownload(enabled: Boolean) {
        context.settingsDataStore.edit { prefs ->
            prefs[WIFI_ONLY_DOWNLOAD] = enabled
        }
    }

    suspend fun setAutoSyncEnabled(enabled: Boolean) {
        context.settingsDataStore.edit { prefs ->
            prefs[AUTO_SYNC_ENABLED] = enabled
        }
    }
}
