package com.example.smartenglish.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
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
    private val TAG = "NetworkMonitor"

    private val _isOnline = MutableStateFlow(checkCurrentConnection())
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private val _connectionType = MutableStateFlow(getConnectionType())
    val connectionType: StateFlow<ConnectionType> = _connectionType.asStateFlow()

    private var callback: ConnectivityManager.NetworkCallback? = null

    private fun checkCurrentConnection(): Boolean {
        val network = connectivityManager.activeNetwork
        Log.i(TAG, "checkCurrentConnection: activeNetwork = $network")
        if (network == null) return false
        val capabilities = connectivityManager.getNetworkCapabilities(network)
        Log.i(TAG, "checkCurrentConnection: capabilities = $capabilities")
        if (capabilities == null) return false
        val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        Log.i(TAG, "checkCurrentConnection: hasInternet = $hasInternet")
        return hasInternet
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

    private fun updateNetworkState() {
        val hasInternet = checkCurrentConnection()
        val connType = getConnectionType()
        Log.i(TAG, "updateNetworkState: hasInternet = $hasInternet, connectionType = $connType")
        _isOnline.value = hasInternet
        _connectionType.value = connType
    }

    fun startMonitoring() {
        Log.i(TAG, "startMonitoring called. callback = $callback")
        if (callback != null) return

        callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.i(TAG, "onAvailable: network = $network")
                updateNetworkState()
            }

            override fun onLost(network: Network) {
                Log.i(TAG, "onLost: network = $network")
                updateNetworkState()
            }

            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                Log.i(TAG, "onCapabilitiesChanged: network = $network")
                updateNetworkState()
            }
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            Log.i(TAG, "Registering default network callback")
            connectivityManager.registerDefaultNetworkCallback(callback!!)
        } else {
            Log.i(TAG, "Registering network callback with request")
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            connectivityManager.registerNetworkCallback(request, callback!!)
        }
    }

    fun stopMonitoring() {
        Log.i(TAG, "stopMonitoring called. callback = $callback")
        callback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering callback: ${e.message}")
            }
        }
        callback = null
    }

    enum class ConnectionType {
        WIFI, CELLULAR, OTHER, NONE
    }
}

