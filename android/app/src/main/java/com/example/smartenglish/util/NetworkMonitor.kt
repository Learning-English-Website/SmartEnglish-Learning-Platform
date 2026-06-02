package com.example.smartenglish.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _isOnline = MutableStateFlow(checkCurrentConnection())
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private val _connectionType = MutableStateFlow(getConnectionType())
    val connectionType: StateFlow<ConnectionType> = _connectionType.asStateFlow()

    private var callback: ConnectivityManager.NetworkCallback? = null

    private fun checkCurrentConnection(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun getConnectionType(): ConnectionType {
        val network = connectivityManager.activeNetwork ?: return ConnectionType.NONE
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return ConnectionType.NONE
        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> ConnectionType.WIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> ConnectionType.CELLULAR
            else -> ConnectionType.OTHER
        }
    }

    fun startMonitoring() {
        if (callback != null) return

        callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                _isOnline.value = true
                _connectionType.value = getConnectionType()
            }

            override fun onLost(network: Network) {
                _isOnline.value = false
                _connectionType.value = ConnectionType.NONE
            }

            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                _connectionType.value = when {
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> ConnectionType.WIFI
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> ConnectionType.CELLULAR
                    else -> ConnectionType.OTHER
                }
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(request, callback!!)
    }

    fun stopMonitoring() {
        callback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (_: Exception) { }
        }
        callback = null
    }

    enum class ConnectionType {
        WIFI, CELLULAR, OTHER, NONE
    }
}
