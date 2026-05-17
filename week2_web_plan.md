# 🌐 WEEK 2: WEB APP — Dev B Plan (7 Ngày)

> **Tech Stack:** React + TypeScript + Vite + Tailwind CSS + React Query + React Router + Axios
> **Architecture:** Clean Architecture (components/services/hooks/utils)
> **Mục tiêu:** Flashcard Set CRUD, Flashcard CRUD, Browse/Search, Import CSV, Folder & Tag management, Share

---

## 📆 NGÀY 1 — Flashcard Set CRUD Pages

### Tasks
- [ ] Tạo folder structure cho web:
  ```
  src/
  ├── components/           # Shared UI components
  │   ├── ui/              # Button, Input, Card, Modal, etc.
  │   ├── flashcard/       # FlashcardViewer, CardEditor
  │   └── layout/          # Header, Sidebar, Footer
  ├── pages/               # Page components
  │   ├── MySets.tsx       # My Sets page
  │   ├── SetDetail.tsx    # Set detail + card list
  │   ├── CreateSet.tsx    # Create new set
  │   ├── EditSet.tsx      # Edit set metadata
  │   ├── Browse.tsx       # Browse public sets
  │   └── Study.tsx        # Study mode page
  ├── services/            # API services
  │   ├── api.ts           # Axios instance
  │   ├── setService.ts    # Flashcard Set CRUD
  │   ├── cardService.ts   # Flashcard CRUD
  │   └── tagService.ts    # Tag CRUD
  ├── hooks/               # Custom React hooks
  │   ├── useSets.ts       # React Query hooks for sets
  │   └── useCards.ts      # React Query hooks for cards
  ├── types/               # TypeScript types
  │   ├── Set.ts
  │   ├── Card.ts
  │   └── Api.ts
  └── utils/               # Utilities
  ```
- [ ] Tạo `src/types/Set.ts`:
  ```typescript
  export interface FlashcardSet {
    _id: string;
    title: string;
    description: string;
    language: string;
    tags: string[];
    isPublic: boolean;
    cardCount: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
  ```
- [ ] Tạo `src/services/api.ts`:
  ```typescript
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  export const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
  });

  api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  ```
- [ ] Tạo `src/services/setService.ts`:
  ```typescript
  export const setService = {
    getMySets: () => api.get<FlashcardSet[]>('/flashcard-sets/my'),
    getPublicSets: (params?: { search?: string; tags?: string[]; page?: number }) =>
      api.get<FlashcardSet[]>('/flashcard-sets/public', { params }),
    getById: (id: string) => api.get<FlashcardSet>(`/flashcard-sets/${id}`),
    create: (data: CreateSetInput) => api.post<FlashcardSet>('/flashcard-sets', data),
    update: (id: string, data: UpdateSetInput) => api.put<FlashcardSet>(`/flashcard-sets/${id}`, data),
    delete: (id: string) => api.delete(`/flashcard-sets/${id}`),
  };
  ```
- [ ] Tạo `src/pages/CreateSet.tsx`:
  - Form: title, description, language (dropdown), isPublic (checkbox)
  - Validation: title required, min 3 chars
  - Submit → POST /flashcard-sets → redirect to SetDetail
  - Loading state + error handling
- [ ] Tạo `src/pages/MySets.tsx`:
  - Grid layout hiển thị danh sách sets (Card component)
  - Mỗi card: title, description, card count, created date, edit/delete buttons
  - Empty state: "Bạn chưa có flashcard set nào"
  - "Create New Set" button → CreateSet page
- [ ] Tạo `src/components/ui/SetCard.tsx`:
  ```tsx
  interface SetCardProps {
    set: FlashcardSet;
    onEdit?: () => void;
    onDelete?: () => void;
  }
  ```
- [ ] Tạo `src/pages/EditSet.tsx`:
  - Pre-fill form với existing data
  - Save → PUT /flashcard-sets/:id
  - Delete button với confirmation modal
- [ ] Verify: CRUD hoạt động, sets hiển thị đúng, edit/delete working

### ✅ Deliverable
Flashcard Set CRUD hoàn chỉnh. Create, Read, Update, Delete sets hoạt động.

---

## 📆 NGÀY 2 — Flashcard CRUD + SetDetail Page

### Tasks
- [ ] Tạo `src/types/Card.ts`:
  ```typescript
  export interface Flashcard {
    _id: string;
    setId: string;
    front: string;        // Word/question
    back: string;         // Meaning/answer
    pronunciation?: string;
    example?: string;
    note?: string;
    collocation?: string;
    relatedWords?: string[];
    image?: string;
    audio?: string;
    order: number;
    createdAt: string;
  }

  export interface CreateCardInput {
    front: string;
    back: string;
    pronunciation?: string;
    example?: string;
    note?: string;
    collocation?: string;
    relatedWords?: string[];
    image?: string;
    audio?: string;
  }
  ```
- [ ] Tạo `src/services/cardService.ts`:
  ```typescript
  export const cardService = {
    getBySetId: (setId: string) => api.get<Flashcard[]>(`/flashcards/set/${setId}`),
    create: (setId: string, data: CreateCardInput) =>
      api.post<Flashcard>(`/flashcards/set/${setId}`, data),
    bulkCreate: (setId: string, cards: CreateCardInput[]) =>
      api.post<Flashcard[]>(`/flashcards/set/${setId}/bulk`, { cards }),
    update: (cardId: string, data: Partial<CreateCardInput>) =>
      api.put<Flashcard>(`/flashcards/${cardId}`, data),
    delete: (cardId: string) => api.delete(`/flashcards/${cardId}`),
    reorder: (setId: string, cardIds: string[]) =>
      api.put(`/flashcards/set/${setId}/reorder`, { cardIds }),
  };
  ```
- [ ] Tạo `src/components/flashcard/CardEditor.tsx`:
  - Full form: front, back, pronunciation, example, note, collocation, relatedWords
  - Image URL input (future: image upload)
  - Validation: front & back required
  - Compact mode vs Full mode
- [ ] Tạo `src/pages/SetDetail.tsx`:
  - Header: Set title, description, card count, edit set button
  - Card list (table/list view toggle)
  - Each card row: front, back, edit button, delete button
  - Drag-to-reorder (optional for v1)
  - "Add Card" button → inline form or modal
  - "Add Multiple Cards" button → bulk add modal
- [ ] Tạo `src/components/flashcard/CardList.tsx`:
  - Table view: index, front, back, actions
  - Hover effect, selected state
  - Delete confirmation
- [ ] Tạo `src/components/flashcard/BulkAddModal.tsx`:
  - Textarea input: mỗi dòng "front | back"
  - Preview table sau khi parse
  - Submit → bulkCreate API
- [ ] Tạo `src/components/flashcard/FlashcardViewer.tsx`:
  - Card flip animation (CSS transform)
  - Front: word, pronunciation (audio button), example
  - Back: meaning, note, related words
  - Flip on click or spacebar
  - Shuffle toggle
  - Progress indicator: "3/20"
  - Next/Previous buttons
- [ ] Verify: Cards CRUD hoạt động, flip animation smooth

### ✅ Deliverable
SetDetail page hoàn chỉnh. Flashcard CRUD hoạt động. Flip animation mượt.

---

## 📆 NGÀY 3 — Browse/Search + Tag System

### Tasks
- [ ] Tạo `src/services/tagService.ts`:
  ```typescript
  export const tagService = {
    getAll: () => api.get<Tag[]>('/tags'),
    create: (name: string) => api.post<Tag>('/tags', { name }),
    search: (query: string) => api.get<Tag[]>(`/tags/search?q=${query}`),
  };
  ```
- [ ] Tạo `src/pages/Browse.tsx`:
  - Search bar (debounced, 300ms)
  - Filter sidebar:
    - Tags (checkbox list, multi-select)
    - Language (dropdown)
    - Sort by: newest, most cards, most popular
  - Results grid: SetCard components
  - Pagination (load more button)
  - Empty state: "No sets found"
- [ ] Tạo `src/components/ui/SearchBar.tsx`:
  ```tsx
  interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }
  ```
- [ ] Tạo `src/components/ui/TagPicker.tsx`:
  - Autocomplete dropdown
  - Create new tag inline
  - Selected tags displayed as chips
  - Remove tag button
- [ ] Tạo `src/components/ui/FilterSidebar.tsx`:
  - Collapsible sections
  - Mobile: bottom sheet instead of sidebar
- [ ] Cập nhật CreateSet/EditSet để sử dụng TagPicker
- [ ] Tạo `src/pages/SetDetail.tsx` update:
  - Tags displayed as clickable chips → filter by tag when clicked
- [ ] Implement `useDebounce` hook:
  ```typescript
  export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
  }
  ```
- [ ] Verify: Search + filter hoạt động, tags save correctly

### ✅ Deliverable
Browse page với search + filter. Tag system hoạt động. Public sets discoverable.

---

## 📆 NGÀY 4 — Folder Management + Import CSV

### Tasks
- [ ] Tạo `src/services/folderService.ts`:
  ```typescript
  export const folderService = {
    getAll: () => api.get<Folder[]>('/folders'),
    create: (name: string, parentId?: string) =>
      api.post<Folder>('/folders', { name, parentId }),
    update: (id: string, name: string) => api.put<Folder>(`/folders/${id}`, { name }),
    delete: (id: string) => api.delete(`/folders/${id}`),
    addSet: (folderId: string, setId: string) =>
      api.post(`/folders/${folderId}/sets`, { setId }),
    removeSet: (folderId: string, setId: string) =>
      api.delete(`/folders/${folderId}/sets/${setId}`),
  };
  ```
- [ ] Tạo `src/components/layout/Sidebar.tsx`:
  - Folder tree view (nested folders)
  - "All Sets" link
  - "Public Sets" link
  - Folder actions: create, rename, delete
  - Drag sets into folders (future)
- [ ] Tạo `src/components/ui/FolderTree.tsx`:
  - Recursive component
  - Expand/collapse
  - Active folder highlight
- [ ] Tạo `src/pages/MySets.tsx` update:
  - Sidebar + content layout
  - Filter by selected folder
- [ ] Tạo `src/components/flashcard/ImportModal.tsx`:
  - File upload: drag & drop zone
  - Support: CSV, XLSX
  - Parse preview:
    ```typescript
    interface ParseResult {
      headers: string[];
      rows: string[][];
      mapped: { front: number; back: number; pronunciation?: number };
    }
    ```
  - Column mapping UI: map CSV columns to card fields
  - Field mapping: front, back, pronunciation, example, note
  - Submit → bulkCreate
- [ ] Tạo `src/utils/parseCSV.ts`:
  ```typescript
  export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    return { headers, rows };
  }
  ```
- [ ] Tạo `src/utils/parseXLSX.ts` (dùng SheetJS):
  ```typescript
  export async function parseXLSX(file: File): Promise<{ headers: string[]; rows: string[][] }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  }
  ```
- [ ] Tạo `src/pages/SetDetail.tsx` update:
  - "Import" button → ImportModal
- [ ] Verify: Import CSV 50+ cards thành công, data chính xác

### ✅ Deliverable
Folder management hoạt động. Import CSV/XLSX hoạt động. Bulk card creation working.

---

## 📆 NGÀY 5 — Study Session + Share

### Tasks
- [x] Tạo `src/services/studyService.ts`:
  ```typescript
  export const studyService = {
    startSession: (setId: string) =>
      api.post<StudySession>(`/study-sessions/start`, { setId }),
    submitAnswer: (sessionId: string, cardId: string, isCorrect: boolean) =>
      api.post(`/study-sessions/${sessionId}/answer`, { cardId, isCorrect }),
    completeSession: (sessionId: string) =>
      api.post<StudyResult>(`/study-sessions/${sessionId}/complete`),
  };
  ```
- [x] Tạo `src/pages/Study.tsx`:
  - Fetch cards from set
  - Shuffle option
  - Card flip interaction
  - "Know" / "Don't Know" buttons
  - Session progress bar
  - Results summary at end
- [x] Cập nhật FlashcardViewer:
  - Add "Know" / "Don't Know" action buttons
  - Record response locally
- [x] Tạo `src/pages/StudyResult.tsx`:
  - Score: "8/10 correct"
  - Time spent
  - Cards to review (incorrect ones)
  - "Study Again" / "Back to Set" buttons
- [x] Tạo `src/services/shareService.ts`:
  ```typescript
  export const shareService = {
    share: (setId: string) => api.post<ShareLink>(`/shares`, { setId }),
    getByLink: (shareCode: string) => api.get<FlashcardSet>(`/shares/${shareCode}`),
  };
  ```
- [x] Tạo `src/components/ui/ShareModal.tsx`:
  - Generate shareable link: `https://app.com/shared/{shareCode}`
  - Copy to clipboard button
  - Social share buttons (optional)
- [x] Tạo `src/pages/SharedSet.tsx`:
  - View public/shared set (read-only)
  - "Add to My Sets" button → copy to user's account
  - "Study This Set" button
- [x] Verify: Study session hoạt động, share link working

### ✅ Deliverable
Study session flow hoạt động. Share hoàn chỉnh.

---

## 📆 NGÀY 6 — Polish + Note System + Responsive ✅

### Tasks
- [x] Responsive design polish (sidebar, mobile)
- [x] Loading states (Skeleton loaders)
- [x] Toast notifications (react-hot-toast)
- [x] Error handling UI
- [x] Accessibility (ARIA labels, keyboard navigation)

### ✅ Deliverable
 Responsive design complete. Polish done.

---

## 📆 NGÀY 7 — Integration Test + Sprint Review ✅

### Tasks
- [x] **Full E2E test setup** (Playwright)
- [x] **E2E test specs**:
  - [x] Create set → add cards → edit set → delete set
  - [x] Browse → search → filter by tag → open set
  - [x] Study session → flip cards → complete
  - [x] Share set → copy link → view shared
  - [x] Create folder → add set → view
- [x] Cross-browser verification (Chrome, Edge)

### ✅ Deliverable
Web app stable. Week 2 features hoàn chỉnh. Sẵn sàng cho Week 3 (Study Modes).

---

## 📋 Week 2 Web Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | Project structure setup | ✅ |
| 2 | Flashcard Set CRUD pages | ✅ |
| 3 | Flashcard CRUD (add/edit/delete) | ✅ |
| 4 | Bulk card creation | ✅ |
| 5 | FlashcardViewer + flip animation | ✅ |
| 6 | Browse/Search page | ✅ |
| 7 | Tag system (create, assign, filter) | ✅ |
| 8 | Folder management UI | ✅ |
| 9 | Import CSV/XLSX | ✅ |
| 10 | Study session flow | ✅ |
| 11 | Share modal + copy link | ✅ |
| 12 | Responsive design + Skeleton loaders | ✅ |
| 13 | E2E tests (Playwright) | ✅ |
| 14 | Toast notifications | ✅ |
| 15 | Accessibility (ARIA labels) | ✅ |

---

## ✅ Deliverables Completed (Week 2)

### Backend APIs (All tested - 144 tests passing)
- Auth: register, login, logout, forgot-password, OTP verification
- User: profile CRUD
- FlashcardSet: CRUD với tags
- Flashcard: CRUD + bulk create + reorder
- Tags: CRUD + search
- Folders: CRUD + add/remove sets
- Study Sessions: start, submit answer, complete
- Share: create, get by code, list, deactivate

### Frontend Features
- MySets page với folder tree, Skeleton loading
- SetDetail page với tabs (Cards/Notes), Drag & Drop
- Browse page với search, filter by tag
- Study page với FlashcardViewer
- SharedSet page
- Import CSV/XLSX
- Share modal + copy link
- Toast notifications (react-hot-toast)
- Responsive design
- Accessibility (ARIA labels)

### Testing
- Backend: 144 integration tests passing
- Frontend: E2E test specs created (Playwright)

---

## 🔗 API Endpoints Cần Dùng (Tuần 2)

```
# Flashcard Set CRUD
GET    /api/flashcard-sets/my                    → FlashcardSet[]
GET    /api/flashcard-sets/public               → FlashcardSet[]
GET    /api/flashcard-sets/:id                   → FlashcardSet
POST   /api/flashcard-sets                       → FlashcardSet
PUT    /api/flashcard-sets/:id                   → FlashcardSet
DELETE /api/flashcard-sets/:id                   → void

# Flashcard CRUD
GET    /api/flashcards/set/:setId                → Flashcard[]
POST   /api/flashcards/set/:setId                 → Flashcard
POST   /api/flashcards/set/:setId/bulk            → Flashcard[]
PUT    /api/flashcards/:cardId                    → Flashcard
DELETE /api/flashcards/:cardId                   → void
PUT    /api/flashcards/set/:setId/reorder         → void

# Tags
GET    /api/tags                                 → Tag[]
POST   /api/tags                                 → Tag
GET    /api/tags/search?q=                       → Tag[]

# Folders
GET    /api/folders                              → Folder[]
POST   /api/folders                              → Folder
PUT    /api/folders/:id                          → Folder
DELETE /api/folders/:id                          → void
POST   /api/folders/:id/sets                     → void
DELETE /api/folders/:id/sets/:setId              → void

# Study Sessions
POST   /api/study-sessions/start                → StudySession
POST   /api/study-sessions/:id/answer            → void
POST   /api/study-sessions/:id/complete          → StudyResult

# Share
POST   /api/shares                               → ShareLink

```

> [!TIP]
> Phối hợp với Dev A để verify API endpoints. Dùng Postman/curl test trước khi implement frontend.
