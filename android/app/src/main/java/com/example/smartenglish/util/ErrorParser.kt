package com.example.smartenglish.util

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.example.smartenglish.data.remote.dto.ApiResponse

object ErrorParser {
    private val moshi by lazy {
        Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    fun parseErrorMessage(errorBody: String?): String {
        if (errorBody.isNullOrBlank()) return "Lỗi hệ thống hoặc lỗi kết nối"
        
        // 1. Fast, safe regex fallback
        try {
            val messageRegex = """"message"\s*:\s*"([^"]+)"""".toRegex()
            val matches = messageRegex.findAll(errorBody).toList()
            if (matches.isNotEmpty()) {
                val match = matches.last().groupValues[1]
                if (match.isNotBlank() && !match.equals("null", ignoreCase = true)) {
                    return translateErrorMessage(match)
                }
            }
        } catch (_: Exception) {}

        // 2. Moshi parsing
        try {
            val adapter = moshi.adapter(ApiResponse::class.java)
            val apiResponse = adapter.fromJson(errorBody)
            val msg = apiResponse?.error?.message ?: apiResponse?.message
            if (!msg.isNullOrBlank()) {
                return translateErrorMessage(msg)
            }
        } catch (_: Exception) {}

        return "Lỗi hệ thống hoặc lỗi kết nối"
    }

    private fun translateErrorMessage(msg: String): String {
        return when {
            msg.contains("No token provided", ignoreCase = true) -> "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"
            msg.contains("jwt expired", ignoreCase = true) -> "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"
            msg.contains("invalid signature", ignoreCase = true) -> "Lỗi xác thực, vui lòng đăng nhập lại"
            msg.contains("jwt malformed", ignoreCase = true) -> "Lỗi xác thực, vui lòng đăng nhập lại"
            msg.contains("Invalid credentials", ignoreCase = true) -> "Email hoặc mật khẩu không chính xác"
            msg.contains("Email not verified", ignoreCase = true) -> "Email chưa được xác thực"
            msg.contains("User not found", ignoreCase = true) -> "Không tìm thấy người dùng"
            msg.contains("Password is incorrect", ignoreCase = true) -> "Mật khẩu không chính xác"
            msg.contains("Email already in use", ignoreCase = true) -> "Email này đã được sử dụng"
            msg.contains("Folder not found", ignoreCase = true) -> "Không tìm thấy thư mục"
            msg.contains("Set not found", ignoreCase = true) -> "Không tìm thấy học phần"
            else -> msg
        }
    }
}
