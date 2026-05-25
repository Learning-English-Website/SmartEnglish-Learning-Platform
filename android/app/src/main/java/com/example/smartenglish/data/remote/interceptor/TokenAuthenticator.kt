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
        private const val BASE_URL = "http://10.0.2.2:5000/api/"
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

        val refreshToken = tokenManager.getRefreshToken() ?: return null

        if (!isRefreshing.compareAndSet(false, true)) {
            return null
        }

        return try {
            doRefresh(response, refreshToken)
        } finally {
            isRefreshing.set(false)
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
                        return@runBlocking response.request
                            .newBuilder()
                            .removeHeader("Authorization")
                            .addHeader("Authorization", "Bearer $newAccessToken")
                            .build()
                    }
                }

                tokenManager.clearTokens()
                null
            } catch (e: Exception) {
                tokenManager.clearTokens()
                null
            }
        }
    }
}
