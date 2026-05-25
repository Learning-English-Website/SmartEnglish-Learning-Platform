# Week 2 Feature Tests

## Test Cases cho Week 2 - SmartEnglish Flashcard App

### 1. Authentication Tests (Phase 1)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| AUTH-01 | Login với credentials đúng | User logged in, JWT saved to SharedPreferences |
| AUTH-02 | Login với credentials sai | Error message displayed |
| AUTH-03 | Token expiration handling | Auto refresh or logout |
| AUTH-04 | Logout | Tokens cleared, redirect to login |

### 2. Set Management Tests (Phase 3)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SET-01 | Create new set | Set created, appears in list |
| SET-02 | View set details | Shows all set info, card count |
| SET-03 | Edit set | Changes saved, reflected in list |
| SET-04 | Delete set | Set removed, confirmation dialog |
| SET-05 | Search sets | Filters results in real-time |
| SET-06 | Filter by subject | Only matching sets shown |

### 3. Card Management Tests (Phase 4)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CARD-01 | Create card with required fields | Card created, count updated |
| CARD-02 | Create card with all fields | All fields saved correctly |
| CARD-03 | Edit card | Changes saved |
| CARD-04 | Delete card | Card removed, count updated |
| CARD-05 | Search cards | Matching cards filtered |
| CARD-06 | Card validation | Front/back required, shows error |

### 4. Study Mode Tests (Phase 5)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| STUDY-01 | Start study session | Cards loaded, flip animation works |
| STUDY-02 | Flip card | Shows back side |
| STUDY-03 | Answer "Again" | Card marked for review, next card |
| STUDY-04 | Answer "Good" | Streak increases, next review scheduled |
| STUDY-05 | Complete session | Results screen with stats |
| STUDY-06 | Spaced repetition | Due cards prioritized |

### 5. Sharing & Deep Link Tests (Phase 6)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SHARE-01 | Create share link | Share link generated |
| SHARE-02 | Copy share link | Link copied to clipboard |
| SHARE-03 | Share via system intent | Share dialog opens |
| SHARE-04 | Toggle public/private | Status updated |
| SHARE-05 | Open deep link | DeepLinkActivity handles it |
| SHARE-06 | Invalid share code | Error screen shown |

### 6. Search & Filter Tests (Phase 7)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SEARCH-01 | Search my sets | Filters local sets |
| SEARCH-02 | Search public sets | Shows public sets |
| SEARCH-03 | Filter by subject | Only matching sets |
| SEARCH-04 | Filter by tags | Only matching tags |
| SEARCH-05 | Clear filters | All results shown |
| SEARCH-06 | No results | "No results" message |

### 7. Offline Sync Tests (Phase 8)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SYNC-01 | Create offline | Saved locally with pending status |
| SYNC-02 | Come online | Auto sync triggered |
| SYNC-03 | Manual sync | Syncs all pending changes |
| SYNC-04 | Network change | Status indicator updates |
| SYNC-05 | Conflict resolution | Server wins (last write wins) |

---

## Manual Test Checklist

### Authentication Flow
- [ ] Open app → Login screen
- [ ] Enter valid credentials → Home screen
- [ ] Check SharedPreferences for tokens
- [ ] Logout → Tokens cleared

### Set CRUD Flow
- [ ] Home → "My Sets" → Empty state
- [ ] Create set → Form validation
- [ ] Set created → Appears in list
- [ ] Tap set → Detail screen
- [ ] Edit set → Changes saved
- [ ] Delete set → Confirmation → Removed

### Card CRUD Flow
- [ ] Set detail → "Add Cards" → Card list (empty)
- [ ] Create card → Front/back required
- [ ] Card created → List updated
- [ ] Edit card → All fields editable
- [ ] Delete card → Removed

### Study Flow
- [ ] Set detail → "Study" → Loading
- [ ] Card shown → Tap to flip
- [ ] Back revealed → Answer buttons
- [ ] Tap answer → Next card
- [ ] All cards done → Results screen
- [ ] Review stats → Restart or Exit

### Sharing Flow
- [ ] Set detail → Share icon
- [ ] Bottom sheet → Copy/Share buttons
- [ ] Copy → Toast "Copied"
- [ ] Share → System share dialog
- [ ] Toggle public → Updates

### Search Flow
- [ ] Search icon → Search screen
- [ ] Type query → Results update
- [ ] Tap filter → Bottom sheet
- [ ] Select filters → Applied
- [ ] No results → Message shown

### Offline Flow
- [ ] Turn off WiFi
- [ ] Create set → Saved locally
- [ ] Turn on WiFi
- [ ] Auto sync → Server updated

---

## Unit Test Examples

```kotlin
// Example Unit Tests (to be added)

class SetRepositoryTest {
    @Test
    fun `createSet should save to local database first`() {
        // Given
        val setRepository = SetRepositoryImpl(mockApi, mockDao)
        
        // When
        val result = runBlocking { 
            setRepository.createSet("Test Set", null, null, null, false, emptyList())
        }
        
        // Then
        assert(result is ApiResult.Success)
        verify(mockDao).insertSet(any())
    }
}

class CardRepositoryTest {
    @Test
    fun `deleteCard should update card count`() {
        // Given
        val cardRepository = CardRepositoryImpl(mockApi, mockCardDao, mockSetDao)
        
        // When
        runBlocking { 
            cardRepository.deleteCard("card-id")
        }
        
        // Then
        verify(mockSetDao).decrementCardCount(any())
    }
}

class SpacedRepetitionTest {
    @Test
    fun `next review should double interval on correct`() {
        // Given
        val repository = CardRepositoryImpl(...)
        
        // When - First correct answer
        repository.updateCardStudyProgress("card-id", correct = true)
        
        // Then - Next review should be 2 days
        val card = runBlocking { repository.getCardById("card-id") }
        // Verify nextReviewDate is 2 days from now
    }
}
```
