package com.example.smartenglish

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.example.smartenglish.data.sync.SyncScheduler
import com.example.smartenglish.util.NetworkMonitor
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class SmartEnglishApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    @Inject
    lateinit var syncScheduler: SyncScheduler

    @Inject
    lateinit var networkMonitor: NetworkMonitor

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        networkMonitor.startMonitoring()
        syncScheduler.schedulePeriodicSync()

        // Tự động kích hoạt đồng bộ khi có mạng trở lại
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Default).launch {
            networkMonitor.isOnline.collect { isOnline ->
                if (isOnline) {
                    syncScheduler.triggerImmediateSync()
                }
            }
        }
    }

    override fun onTerminate() {
        super.onTerminate()
        networkMonitor.stopMonitoring()
    }
}
