package com.example.smartenglish.data.remote.interceptor

import com.example.smartenglish.data.remote.dto.RefreshRequest
import com.example.smartenglish.util.TokenManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenManager: TokenManager
) : Authenticator {

    companion object {
        private const val BASE_URL = "https://smartenglish-api-1iby.onrender.com/api/"
        private var lastRefreshFailureTime = 0L
        private const val COOLDOWN_MS = 5000L
    }

    private val isRefreshing = AtomicBoolean(false)

    private val authApi: com.example.smartenglish.data.remote.api.AuthApi by lazy {
        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        val cleanClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(cleanClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(com.example.smartenglish.data.remote.api.AuthApi::class.java)
    }

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.code != 401) return null

        val now = System.currentTimeMillis()
        if (now - lastRefreshFailureTime < COOLDOWN_MS) {
            return null
        }

        val currentHeader = response.request.header("Authorization")
        val currentToken = tokenManager.getAccessToken()

        // If the token has already been refreshed by another concurrent thread,
        // retry this request with the new access token immediately.
        if (currentToken != null && currentHeader != "Bearer $currentToken") {
            return response.request.newBuilder()
                .removeHeader("Authorization")
                .addHeader("Authorization", "Bearer $currentToken")
                .build()
        }

        val refreshToken = tokenManager.getRefreshToken() ?: return null

        synchronized(this) {
            val updatedToken = tokenManager.getAccessToken()
            // Double-check inside synchronized block in case another thread refreshed it while we were waiting
            if (updatedToken != null && currentHeader != "Bearer $updatedToken") {
                return response.request.newBuilder()
                    .removeHeader("Authorization")
                    .addHeader("Authorization", "Bearer $updatedToken")
                    .build()
            }

            return doRefresh(response, refreshToken)
        }
    }

    private fun doRefresh(response: Response, refreshToken: String): Request? {
        return runBlocking {
            try {
                val refreshResponse = authApi.refresh(RefreshRequest(refreshToken))

                if (refreshResponse.isSuccessful && refreshResponse.body()?.success == true) {
                    val data = refreshResponse.body()?.data
                    val newAccessToken = data?.accessToken
                    val newRefreshToken = data?.refreshToken

                    if (newAccessToken != null && newRefreshToken != null) {
                        tokenManager.saveTokens(newAccessToken, newRefreshToken)
                        lastRefreshFailureTime = 0L
                        return@runBlocking response.request
                            .newBuilder()
                            .removeHeader("Authorization")
                            .addHeader("Authorization", "Bearer $newAccessToken")
                            .build()
                    }
                }

                // ONLY clear user tokens if the backend explicitly rejects the refresh token (e.g. 400, 401, 403)
                // This means the session is truly invalid or expired.
                if (refreshResponse.code() in 400..403) {
                    tokenManager.clearTokens()
                }
                lastRefreshFailureTime = System.currentTimeMillis()
                null
            } catch (e: Exception) {
                // DO NOT clear user tokens on network timeouts or transient socket/connection errors.
                // This prevents logging the user out during temporary network drops!
                lastRefreshFailureTime = System.currentTimeMillis()
                null
            }
        }
    }
}
