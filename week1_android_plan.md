# 📱 WEEK 1: ANDROID APP — Quizlet-Style Database

> **Tech Stack:** Kotlin + Jetpack Compose + Hilt + Retrofit + Room
> **Architecture:** MVVM + Clean Architecture (data/domain/presentation)
> **Mục tiêu:** Điều chỉnh Room database để match với backend MongoDB, đơn giản như Quizlet

---

## 📌 Lưu ý Quan trọng

- ✅ **Auth flow đã hoàn thành** (Register, Login, Forgot Password)
- ✅ **Navigation + DI đã setup**
- ❌ **Database chưa match với backend** - cần fix
- ❌ **Week 1 KHÔNG cần làm UI đẹp** - chỉ fix database thôi
- ❌ **KHÔNG làm quá nhiều như website** - giữ đơn giản như Quizlet

---

## 📆 NGÀY 1 — Fix Room Database Entities

### Mục tiêu
Điều chỉnh Room entities để match với MongoDB backend (không thay đổi structure)

### Tasks

- [ ] **Review backend model:**
  - `FlashcardSet`: `_id`, `title`, `description`, `language`, `isPublic`, `cardCount`, `user`, `tags`, `createdAt`, `updatedAt`
  - `Flashcard`: `_id`, `set`, `front`, `back`, `pronunciation`, `example`, `note`, `imageUrl`, `createdAt`, `updatedAt`
  - `StudySession`: `_id`, `user`, `set`, `startedAt`, `completedAt`

- [ ] **Update `FlashcardSetEntity`:**
  ```kotlin
  @Entity(tableName = "flashcard_sets")
  data class FlashcardSetEntity(
      @PrimaryKey val id: String,              // MongoDB _id
      val title: String,                       // NOT "name" - backend dùng "title"
      val description: String?,
      val language: String = "English",         // Backend mặc định "English"
      val isPublic: Boolean = false,
      val cardCount: Int = 0,
      val userId: String?,
      val tags: String = "",                   // Comma-separated tag IDs
      val createdAt: String?,
      val updatedAt: String?,
      val syncStatus: String = "SYNCED",
      val localCreatedAt: Long = System.currentTimeMillis(),
      val localUpdatedAt: Long = System.currentTimeMillis()
  )
  ```

- [ ] **Update `FlashcardEntity`:**
  ```kotlin
  @Entity(
      tableName = "flashcards",
      foreignKeys = [ForeignKey(
          entity = FlashcardSetEntity::class,
          parentColumns = ["id"],
          childColumns = ["setId"],
          onDelete = ForeignKey.CASCADE
      )],
      indices = [Index("setId")]
  )
  data class FlashcardEntity(
      @PrimaryKey val id: String,              // MongoDB _id
      val setId: String,                       // Foreign key
      val front: String,
      val back: String,
      val pronunciation: String?,
      val example: String?,
      val note: String?,
      val imageUrl: String?,                   // Backend dùng "imageUrl"
      val createdAt: String?,
      val updatedAt: String?,
      val syncStatus: String = "SYNCED",
      val nextReviewDate: String? = null,
      val correctStreak: Int = 0,
      val localCreatedAt: Long = System.currentTimeMillis(),
      val localUpdatedAt: Long = System.currentTimeMillis()
  )
  ```

- [ ] **Update DAOs:**
  ```kotlin
  @Dao
  interface FlashcardSetDao {
      @Query("SELECT * FROM flashcard_sets ORDER BY updatedAt DESC")
      fun getAllSets(): Flow<List<FlashcardSetEntity>>

      @Query("SELECT * FROM flashcard_sets WHERE id = :id")
      suspend fun getSetById(id: String): FlashcardSetEntity?

      @Insert(onConflict = OnConflictStrategy.REPLACE)
      suspend fun insertSet(set: FlashcardSetEntity)

      @Update
      suspend fun updateSet(set: FlashcardSetEntity)

      @Query("DELETE FROM flashcard_sets WHERE id = :id")
      suspend fun deleteSet(id: String)

      @Query("SELECT * FROM flashcard_sets WHERE title LIKE '%' || :query || '%'")
      fun searchSets(query: String): Flow<List<FlashcardSetEntity>>
  }

  @Dao
  interface FlashcardDao {
      @Query("SELECT * FROM flashcards WHERE setId = :setId")
      fun getCardsBySet(setId: String): Flow<List<FlashcardEntity>>

      @Query("SELECT * FROM flashcards WHERE id = :id")
      suspend fun getCardById(id: String): FlashcardEntity?

      @Insert(onConflict = OnConflictStrategy.REPLACE)
      suspend fun insertCard(card: FlashcardEntity)

      @Update
      suspend fun updateCard(card: FlashcardEntity)

      @Query("DELETE FROM flashcards WHERE id = :id")
      suspend fun deleteCard(id: String)
  }
  ```

- [ ] **Update AppDatabase:**
  ```kotlin
  @Database(
      entities = [FlashcardSetEntity::class, FlashcardEntity::class],
      version = 1,
      exportSchema = false
  )
  abstract class AppDatabase : RoomDatabase() {
      abstract fun flashcardSetDao(): FlashcardSetDao
      abstract fun flashcardDao(): FlashcardDao
  }
  ```

### ✅ Deliverable
Room database entities và DAOs match với MongoDB backend.

---

## 📆 NGÀY 2 — Fix DTOs và Repository

### Mục tiêu
Đảm bảo DTOs và Repository hoạt động với backend API

### Tasks

- [ ] **Review API endpoints đã có:**
  - `GET /api/flashcard-sets/my` → user's sets
  - `GET /api/flashcard-sets/:id` → single set
  - `POST /api/flashcard-sets` → create set
  - `PUT /api/flashcard-sets/:id` → update set
  - `DELETE /api/flashcard-sets/:id` → delete set

- [ ] **Fix DTOs trong `FlashcardDto.kt`:**
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class FlashcardSetDto(
      @Json(name = "_id") val id: String,
      @Json(name = "title") val title: String,
      @Json(name = "description") val description: String?,
      @Json(name = "language") val language: String?,
      @Json(name = "isPublic") val isPublic: Boolean,
      @Json(name = "cardCount") val cardCount: Int,
      @Json(name = "user") val user: UserDto?,
      @Json(name = "tags") val tags: List<Any>,
      @Json(name = "createdAt") val createdAt: String?,
      @Json(name = "updatedAt") val updatedAt: String?
  )

  @JsonClass(generateAdapter = true)
  data class FlashcardDto(
      @Json(name = "_id") val id: String,
      @Json(name = "set") val setId: String,
      @Json(name = "front") val front: String,
      @Json(name = "back") val back: String,
      @Json(name = "pronunciation") val pronunciation: String?,
      @Json(name = "example") val example: String?,
      @Json(name = "note") val note: String?,
      @Json(name = "imageUrl") val imageUrl: String?,
      @Json(name = "createdAt") val createdAt: String?,
      @Json(name = "updatedAt") val updatedAt: String?
  )
  ```

- [ ] **Fix CreateSetRequest:**
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class CreateSetRequest(
      @Json(name = "title") val title: String,
      @Json(name = "description") val description: String? = null,
      @Json(name = "language") val language: String? = "English",
      @Json(name = "isPublic") val isPublic: Boolean = false,
      @Json(name = "tags") val tags: List<String> = emptyList()
  )
  ```

- [ ] **Update SetRepositoryImpl:**
  - Sync data từ server → local
  - Handle offline-first: đọc từ local trước, sync khi online

- [ ] **Update CardRepositoryImpl:**
  - Sync cards từ server → local
  - CRUD operations

### ✅ Deliverable
Repository layer hoạt động với backend API.

---

## 📆 NGÀY 3 — Verify Integration

### Tasks

- [ ] **Test End-to-End:**
  - [ ] Register → Login → User data đồng bộ
  - [ ] Create set → hiển thị trong local DB
  - [ ] Sync với server hoạt động

- [ ] **Debug Issues:**
  - [ ] Token authentication
  - [ ] API response parsing
  - [ ] Database sync

### ✅ Deliverable
Week 1 hoàn thành - Database đã sẵn sàng cho Week 2.

---

## 📋 Week 1 Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | FlashcardSetEntity match backend | ⬜ |
| 2 | FlashcardEntity match backend | ⬜ |
| 3 | DAOs work correctly | ⬜ |
| 4 | DTOs parse backend response | ⬜ |
| 5 | Repository sync với server | ⬜ |
| 6 | Login → Set data đồng bộ | ⬜ |

---

## 📌 Database Mismatch Issues (Đã Fix)

1. ~~Backend dùng `title`, Android dùng `name`~~
2. ~~Backend dùng `imageUrl`, Android dùng `image`~~
3. ~~Backend dùng `set` (ObjectId), Android dùng `setId`~~
4. ~~Backend không có `subject`, `gradeLevel`~~

---

## 🔗 Backend API Endpoints

```
# Sets
GET    /api/flashcard-sets/my          → user's sets
GET    /api/flashcard-sets/public       → browse public sets
GET    /api/flashcard-sets/:id          → single set
POST   /api/flashcard-sets              → create set
PUT    /api/flashcard-sets/:id          → update set
DELETE /api/flashcard-sets/:id          → delete set

# Cards
GET    /api/flashcards/set/:setId       → cards in set
POST   /api/flashcards/set/:setId       → create card
POST   /api/flashcards/set/:setId/bulk  → bulk create
PUT    /api/flashcards/:cardId          → update card
DELETE /api/flashcards/:cardId          → delete card
```
