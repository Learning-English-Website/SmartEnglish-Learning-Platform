package com.example.smartenglish.di

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.remote.api.*
import com.example.smartenglish.data.remote.interceptor.AuthInterceptor
import com.example.smartenglish.data.remote.interceptor.TokenAuthenticator
import com.example.smartenglish.data.repository.*
import com.example.smartenglish.domain.repository.*
import com.example.smartenglish.util.TokenManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private const val BASE_URL = "http://10.0.2.2:5000/api/"

    @Provides
    @Singleton
    fun provideMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    @Provides
    @Singleton
    fun provideEncryptedSharedPreferences(@ApplicationContext context: Context): SharedPreferences {
        // TODO: Replace with EncryptedSharedPreferences for production
        // val masterKey = MasterKey.Builder(context)
        //     .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        //     .build()
        // return EncryptedSharedPreferences.create(
        //     context,
        //     "auth_prefs",
        //     masterKey,
        //     EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        //     EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        // )
        return context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
    }

    @Provides
    @Singleton
    fun provideTokenManager(prefs: SharedPreferences): TokenManager {
        return TokenManager(prefs)
    }

    @Provides
    @Singleton
    fun provideAuthInterceptor(tokenManager: TokenManager): AuthInterceptor {
        return AuthInterceptor(tokenManager)
    }

    @Provides
    @Singleton
    fun provideTokenAuthenticator(
        tokenManager: TokenManager
    ): TokenAuthenticator {
        return TokenAuthenticator(tokenManager)
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .authenticator(tokenAuthenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, moshi: Moshi): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    // Auth APIs
    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }

    @Provides
    @Singleton
    fun provideUserApi(retrofit: Retrofit): UserApi {
        return retrofit.create(UserApi::class.java)
    }

    // Flashcard APIs
    @Provides
    @Singleton
    fun provideSetApi(retrofit: Retrofit): SetApi {
        return retrofit.create(SetApi::class.java)
    }

    @Provides
    @Singleton
    fun provideCardApi(retrofit: Retrofit): CardApi {
        return retrofit.create(CardApi::class.java)
    }

    @Provides
    @Singleton
    fun provideStudyApi(retrofit: Retrofit): StudyApi {
        return retrofit.create(StudyApi::class.java)
    }

    @Provides
    @Singleton
    fun provideShareApi(retrofit: Retrofit): ShareApi {
        return retrofit.create(ShareApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTagApi(retrofit: Retrofit): TagApi {
        return retrofit.create(TagApi::class.java)
    }

    // Repositories
    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        tokenManager: TokenManager
    ): AuthRepository {
        return AuthRepositoryImpl(authApi, tokenManager)
    }

    @Provides
    @Singleton
    fun provideUserRepository(userApi: UserApi): UserRepository {
        return UserRepositoryImpl(userApi)
    }

    @Provides
    @Singleton
    fun provideSetRepository(
        setApi: SetApi,
        setDao: FlashcardSetDao
    ): SetRepository {
        return SetRepositoryImpl(setApi, setDao)
    }

    @Provides
    @Singleton
    fun provideCardRepository(
        cardApi: CardApi,
        cardDao: FlashcardDao,
        setDao: FlashcardSetDao
    ): CardRepository {
        return CardRepositoryImpl(cardApi, cardDao, setDao)
    }

    @Provides
    @Singleton
    fun provideStudyRepository(studyApi: StudyApi): StudyRepository {
        return StudyRepositoryImpl(studyApi)
    }

    @Provides
    @Singleton
    fun provideShareRepository(
        shareApi: ShareApi,
        tagApi: TagApi
    ): ShareRepository {
        return ShareRepositoryImpl(shareApi, tagApi)
    }
}
