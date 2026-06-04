package com.example.smartenglish.di

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.smartenglish.data.local.dao.FlashcardDao
import com.example.smartenglish.data.local.dao.FlashcardSetDao
import com.example.smartenglish.data.local.dao.DownloadedContentDao
import com.example.smartenglish.data.remote.api.*
import com.example.smartenglish.data.remote.interceptor.AuthInterceptor
import com.example.smartenglish.data.remote.interceptor.TokenAuthenticator
import com.example.smartenglish.data.repository.*
import com.example.smartenglish.domain.repository.*
import com.example.smartenglish.util.TokenManager
import com.example.smartenglish.util.NetworkMonitor
import com.example.smartenglish.data.sync.SyncManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
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

    private const val BASE_URL = "https://smartenglish-api-1iby.onrender.com/api/"

    @Provides
    @Named("IO")
    fun provideIODispatcher(): CoroutineDispatcher = Dispatchers.IO

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

    @Provides
    @Singleton
    fun provideMediaApi(retrofit: Retrofit): MediaApi {
        return retrofit.create(MediaApi::class.java)
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

    @Provides
    @Singleton
    fun provideProgressApi(retrofit: Retrofit): ProgressApi {
        return retrofit.create(ProgressApi::class.java)
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
    fun provideUserRepository(
        userApi: UserApi,
        mediaApi: MediaApi,
        networkMonitor: NetworkMonitor
    ): UserRepository {
        return UserRepositoryImpl(userApi, mediaApi, networkMonitor)
    }

    @Provides
    @Singleton
    fun provideSetRepository(
        setApi: SetApi,
        setDao: FlashcardSetDao,
        networkMonitor: NetworkMonitor,
        syncManager: SyncManager
    ): SetRepository {
        return SetRepositoryImpl(setApi, setDao, networkMonitor, syncManager)
    }

    @Provides
    @Singleton
    fun provideCardRepository(
        cardApi: CardApi,
        cardDao: FlashcardDao,
        setDao: FlashcardSetDao,
        downloadedContentDao: DownloadedContentDao,
        networkMonitor: NetworkMonitor,
        syncManager: SyncManager,
        moshi: Moshi
    ): CardRepository {
        return CardRepositoryImpl(cardApi, cardDao, setDao, downloadedContentDao, networkMonitor, syncManager, moshi)
    }

    @Provides
    @Singleton
    fun provideStudyRepository(
        studyApi: StudyApi,
        networkMonitor: NetworkMonitor
    ): StudyRepository {
        return StudyRepositoryImpl(studyApi, networkMonitor)
    }

    @Provides
    @Singleton
    fun provideShareRepository(
        shareApi: ShareApi,
        tagApi: TagApi
    ): ShareRepository {
        return ShareRepositoryImpl(shareApi, tagApi)
    }

    @Provides
    @Singleton
    fun provideProgressRepository(
        progressApi: ProgressApi,
        networkMonitor: NetworkMonitor
    ): ProgressRepository {
        return ProgressRepositoryImpl(progressApi, networkMonitor)
    }

    @Provides
    @Singleton
    fun provideFolderApi(retrofit: Retrofit): FolderApi {
        return retrofit.create(FolderApi::class.java)
    }

    @Provides
    @Singleton
    fun provideFolderRepository(folderApi: FolderApi): FolderRepository {
        return FolderRepositoryImpl(folderApi)
    }

    @Provides
    @Singleton
    fun provideGamificationApi(retrofit: Retrofit): GamificationApi {
        return retrofit.create(GamificationApi::class.java)
    }

    @Provides
    @Singleton
    fun provideGamificationRepository(gamificationApi: GamificationApi): GamificationRepository {
        return GamificationRepositoryImpl(gamificationApi)
    }

    @Provides
    @Singleton
    fun provideAdminApi(retrofit: Retrofit): AdminApi {
        return retrofit.create(AdminApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAdminRepository(adminApi: AdminApi, networkMonitor: com.example.smartenglish.util.NetworkMonitor): AdminRepository {
        return AdminRepositoryImpl(adminApi, networkMonitor)
    }

    @Provides
    @Singleton
    fun provideNetworkMonitor(@ApplicationContext context: android.content.Context): com.example.smartenglish.util.NetworkMonitor {
        return com.example.smartenglish.util.NetworkMonitor(context)
    }

    @Provides
    @Singleton
    fun provideSyncManager(
        pendingOperationDao: com.example.smartenglish.data.local.dao.PendingOperationDao,
        flashcardSetDao: com.example.smartenglish.data.local.dao.FlashcardSetDao,
        flashcardDao: com.example.smartenglish.data.local.dao.FlashcardDao,
        downloadedContentDao: com.example.smartenglish.data.local.dao.DownloadedContentDao,
        networkMonitor: com.example.smartenglish.util.NetworkMonitor,
        setApi: com.example.smartenglish.data.remote.api.SetApi,
        cardApi: com.example.smartenglish.data.remote.api.CardApi,
        folderApi: com.example.smartenglish.data.remote.api.FolderApi,
        moshi: com.squareup.moshi.Moshi,
        @Named("IO") dispatcher: CoroutineDispatcher,
        @ApplicationContext applicationContext: android.content.Context
    ): com.example.smartenglish.data.sync.SyncManager {
        return com.example.smartenglish.data.sync.SyncManager(
            pendingOperationDao = pendingOperationDao,
            flashcardSetDao = flashcardSetDao,
            flashcardDao = flashcardDao,
            downloadedContentDao = downloadedContentDao,
            networkMonitor = networkMonitor,
            setApi = setApi,
            cardApi = cardApi,
            folderApi = folderApi,
            moshi = moshi,
            dispatcher = dispatcher,
            applicationContext = applicationContext
        )
    }

    @Provides
    @Singleton
    fun provideSyncScheduler(@ApplicationContext context: android.content.Context): com.example.smartenglish.data.sync.SyncScheduler {
        return com.example.smartenglish.data.sync.SyncScheduler(context)
    }

    @Provides
    @Singleton
    fun provideSettingsRepository(@ApplicationContext context: android.content.Context): com.example.smartenglish.data.repository.SettingsRepository {
        return com.example.smartenglish.data.repository.SettingsRepository(context)
    }

    @Provides
    @Singleton
    fun provideDownloadRepository(
        downloadedContentDao: com.example.smartenglish.data.local.dao.DownloadedContentDao,
        pendingOperationDao: com.example.smartenglish.data.local.dao.PendingOperationDao
    ): com.example.smartenglish.domain.repository.DownloadRepository {
        return com.example.smartenglish.data.repository.DownloadRepositoryImpl(downloadedContentDao, pendingOperationDao)
    }
}
