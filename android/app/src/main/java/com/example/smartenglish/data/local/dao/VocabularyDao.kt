package com.example.smartenglish.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.smartenglish.data.local.entity.WordEntity
import com.example.smartenglish.data.local.entity.WordSetEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VocabularyDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWordSet(wordSet: WordSetEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWordSets(wordSets: List<WordSetEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWord(word: WordEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWords(words: List<WordEntity>)

    @Update
    suspend fun updateWordSet(wordSet: WordSetEntity)

    @Update
    suspend fun updateWord(word: WordEntity)

    @Query("DELETE FROM word_sets WHERE id = :id")
    suspend fun deleteWordSet(id: String)

    @Query("DELETE FROM words WHERE id = :id")
    suspend fun deleteWord(id: String)

    @Query("SELECT * FROM word_sets ORDER BY createdAt DESC")
    fun getAllWordSets(): Flow<List<WordSetEntity>>

    @Query("SELECT * FROM word_sets WHERE id = :id")
    suspend fun getWordSetById(id: String): WordSetEntity?

    @Query("SELECT * FROM words WHERE setId = :setId ORDER BY word ASC")
    fun getWordsBySetId(setId: String): Flow<List<WordEntity>>

    @Query("SELECT * FROM words WHERE id = :id")
    suspend fun getWordById(id: String): WordEntity?

    @Query("SELECT * FROM words WHERE word LIKE '%' || :query || '%' OR meaning LIKE '%' || :query || '%'")
    fun searchWords(query: String): Flow<List<WordEntity>>

    @Query("DELETE FROM word_sets")
    suspend fun deleteAllWordSets()

    @Query("DELETE FROM words")
    suspend fun deleteAllWords()
}
