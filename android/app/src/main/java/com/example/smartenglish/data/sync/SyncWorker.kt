package com.example.smartenglish.data.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncManager: SyncManager
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "SyncWorker"
        const val WORK_NAME = "offline-sync"
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "SyncWorker: starting")

        return try {
            syncManager.refreshPendingCount()
            val result = syncManager.processPendingOperations()

            if (result.isSuccess) {
                Log.d(TAG, "SyncWorker: completed successfully")
                Result.success()
            } else {
                Log.w(TAG, "SyncWorker: completed with failures")
                if (runAttemptCount < 3) {
                    Result.retry()
                } else {
                    Result.failure()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "SyncWorker: error - ${e.message}")
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
}
