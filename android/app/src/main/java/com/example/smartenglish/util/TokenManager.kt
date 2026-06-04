package com.example.smartenglish.util

import android.content.SharedPreferences
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val prefs: SharedPreferences
) {

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ROLE = "user_role"
    }

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    fun saveUserRole(role: String?) {
        prefs.edit().putString(KEY_USER_ROLE, role).apply()
    }

    fun saveAccessToken(accessToken: String) {
        prefs.edit().putString(KEY_ACCESS_TOKEN, accessToken).apply()
    }

    fun saveRefreshToken(refreshToken: String) {
        prefs.edit().putString(KEY_REFRESH_TOKEN, refreshToken).apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun getUserRole(): String? = prefs.getString(KEY_USER_ROLE, null)

    fun clearTokens() {
        prefs.edit().clear().apply()
    }

    fun isLoggedIn(): Boolean = getAccessToken() != null
}
