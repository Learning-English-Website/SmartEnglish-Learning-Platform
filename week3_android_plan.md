# :android: WEEK 3: ANDROID APP — Import/Export + Google Login + Collocation + Home Polish

> **Tech Stack:** Kotlin + Jetpack Compose + Hilt + Retrofit + Room
> **Architecture:** MVVM + Clean Architecture
> **Backend:** Node.js + Express + MongoDB
> **Muc tiêu:** Import/Export CSV/XLSX, Google Login, Collocation fields, Home polish

---

## :notebook: Ghi chu quan trong

- **CSV Import**: Web da co UI + parser. Android chi can goi `POST /api/flashcards/set/:setId/bulk`
- **Backend bulk API**: Da co san tai `POST /flashcards/set/:setId/bulk` - nhan `{ cards: [...] }`
- **Backend**: Can them 2 fields collocation + relatedWords vao model
- **Google Login**: Backend co API tai `/api/auth/google` - chi can implement Android-side

---

## :wrench: Dependencies can them

### Android (build.gradle.kts)
```kotlin
// Google Sign-In
implementation("com.google.android.gms:play-services-auth:21.3.0")

// Apache POI (XLSX parsing)
implementation("org.apache.poi:poi-ooxml:5.2.5")
```

---

## :art: Quizlet Color Palette

```kotlin
val QuizletBlue = Color(0xFF4255FF)
val QuizletCoral = Color(0xFFFF6B6B)
val QuizletGreen = Color(0xFF00C853)
val QuizletYellow = Color(0xFFFFD93D)
```

---

## :calendar: TASK 1 — Export CSV

### Muc tieu
Export cards ra file CSV, chia se qua Android share sheet.

#### Export Utils

```kotlin
// util/CsvExporter.kt
object CsvExporter {

    private val CSV_HEADERS = listOf(
        "front", "back", "pronunciation", "example", "note", "collocation", "relatedWords"
    )

    fun generateCsv(cards: List<Flashcard>): String {
        val sb = StringBuilder()
        sb.append('\uFEFF') // BOM for Excel UTF-8
        sb.appendLine(CSV_HEADERS.joinToString(",") { escapeCsvField(it) })

        cards.forEach { card ->
            val row = listOf(
                card.front, card.back,
                card.pronunciation ?: "", card.example ?: "",
                card.note ?: "", card.collocation ?: "", card.relatedWords ?: ""
            )
            sb.appendLine(row.joinToString(",") { escapeCsvField(it) })
        }
        return sb.toString()
    }

    private fun escapeCsvField(field: String): String {
        return if (field.contains(",") || field.contains("\"") || field.contains("\n")) {
            "\"${field.replace("\"", "\"\"")}\""
        } else field
    }
}
```

#### Export Bottom Sheet

```kotlin
// presentation/sets/ExportBottomSheet.kt
@Composable
fun ExportBottomSheet(
    set: FlashcardSet,
    cards: List<Flashcard>,
    onDismiss: () -> Unit
) {
    var isExporting by remember { mutableStateOf(false) }
    var exportedUri by remember { mutableStateOf<Uri?>(null) }
    val context = LocalContext.current

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Export Cards", style = MaterialTheme.typography.titleLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Text("${cards.size} cards", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Spacer(modifier = Modifier.height(24.dp))

            if (exportedUri != null) {
                Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(48.dp), tint = QuizletGreen)
                Spacer(modifier = Modifier.height(12.dp))
                Text("Exported successfully!", color = QuizletGreen)

                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/csv"
                            putExtra(Intent.EXTRA_STREAM, exportedUri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share CSV"))
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Share, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Share CSV")
                }
            } else {
                OutlinedButton(
                    onClick = {
                        isExporting = true
                        val csvContent = CsvExporter.generateCsv(cards)
                        val fileName = "${set.title.replace(Regex("[^a-zA-Z0-9]"), "_")}_cards.csv"

                        val uri = context.contentResolver
                            .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, null)
                            ?: return@OutlinedButton

                        context.contentResolver.openOutputStream(uri)?.use { os ->
                            os.write(csvContent.toByteArray(StandardCharsets.UTF_8))
                        }
                        exportedUri = uri
                        isExporting = false
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = cards.isNotEmpty() && !isExporting
                ) {
                    if (isExporting) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    } else {
                        Icon(Icons.Default.Download, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Export as CSV")
                    }
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
```

#### Add Export button vao SetDetailScreen TopAppBar

```kotlin
// SetDetailScreen.kt
TopAppBar(
    title = { Text(set.title) },
    actions = {
        IconButton(onClick = { showExportSheet = true }) {
            Icon(Icons.Default.Download, "Export")
        }
        // ... other actions
    }
)
```

### Deliverable
Export CSV - download hoac share qua email, message, etc.

---

## :calendar: TASK 2 — CSV Import

### Muc tieu
Import modal giong Quizlet - chon file, column mapping, preview, goi bulk API.

#### CSV Parser

```kotlin
// util/FileImportHelper.kt
object FileImportHelper {

    fun parseCsv(content: String): CsvParseResult {
        val lines = content.split("\n", "\r\n").filter { it.isNotBlank() }
        if (lines.isEmpty()) return CsvParseResult(emptyList(), emptyList())

        val headers = parseLine(lines[0])
        val rows = lines.drop(1).map { parseLine(it) }
        return CsvParseResult(headers, rows)
    }

    private fun parseLine(line: String): List<String> {
        val result = mutableListOf<String>()
        var current = StringBuilder()
        var inQuotes = false

        for (i in line.indices) {
            val c = line[i]
            val next = line.getOrNull(i + 1)
            when {
                c == '"' && inQuotes && next == '"' -> { current.append('"'); i++ }
                c == '"' -> { inQuotes = !inQuotes }
                c == ',' && !inQuotes -> { result.add(current.toString().trim()); current = StringBuilder() }
                else -> current.append(c)
            }
        }
        result.add(current.toString().trim())
        return result
    }

    data class CsvParseResult(val headers: List<String>, val rows: List<List<String>>)
}
```

#### Column Mapper

```kotlin
// util/ColumnMapper.kt
object ColumnMapper {

    data class Mapping(
        val front: Int, val back: Int,
        val pronunciation: Int = -1, val example: Int = -1,
        val note: Int = -1, val collocation: Int = -1, val relatedWords: Int = -1
    )

    fun autoDetect(headers: List<String>): Mapping {
        val lower = headers.map { it.lowercase() }
        return Mapping(
            front = lower.findIndex { it in listOf("front", "term", "word", "question", "vocab") },
            back = lower.findIndex { it in listOf("back", "definition", "meaning", "answer", "translation", "vietnamese") },
            pronunciation = lower.findIndex { it in listOf("pronunciation", "pronounce", "ipa") },
            example = lower.findIndex { it in listOf("example", "sentence", "usage") },
            note = lower.findIndex { it in listOf("note", "notes", "hint") },
            collocation = lower.findIndex { it in listOf("collocation", "collocations") },
            relatedWords = lower.findIndex { it in listOf("relatedwords", "related", "related words") }
        )
    }

    private fun <T> List<T>.findIndex(predicate: (T) -> Boolean): Int = indexOfFirst(predicate)
}
```

#### ImportViewModel

```kotlin
// presentation/components/ImportViewModel.kt
@HiltViewModel
class ImportViewModel @Inject constructor(
    private val cardRepository: CardRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ImportUiState())
    val uiState: StateFlow<ImportUiState> = _uiState.asStateFlow()

    fun setParsedData(result: FileImportHelper.CsvParseResult, mapping: ColumnMapper.Mapping) {
        _uiState.value = ImportUiState(headers = result.headers, rows = result.rows, mapping = mapping)
    }

    fun updateMapping(mapping: ColumnMapper.Mapping) {
        _uiState.value = _uiState.value.copy(mapping = mapping)
    }

    fun clearData() { _uiState.value = ImportUiState() }

    fun importCards(setId: String) {
        val state = _uiState.value
        if (state.mapping.front < 0 || state.mapping.back < 0) return

        viewModelScope.launch {
            _uiState.value = state.copy(isImporting = true, error = null)
            try {
                val cards = state.rows.mapNotNull { row ->
                    val front = row.getOrNull(state.mapping.front)?.trim()
                    val back = row.getOrNull(state.mapping.back)?.trim()
                    if (front.isNullOrBlank() || back.isNullOrBlank()) null
                    else CreateCardRequest(
                        front = front!!, back = back!!,
                        pronunciation = col(state.mapping.pronunciation, row),
                        example = col(state.mapping.example, row),
                        note = col(state.mapping.note, row),
                        collocation = col(state.mapping.collocation, row),
                        relatedWords = col(state.mapping.relatedWords, row)
                    )
                }
                if (cards.isEmpty()) {
                    _uiState.value = _uiState.value.copy(isImporting = false, error = "No valid cards found")
                    return@launch
                }
                cardRepository.bulkCreateCards(setId, BulkCreateCardsRequest(cards))
                _uiState.value = _uiState.value.copy(isImporting = false, importSuccess = true, importedCount = cards.size)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isImporting = false, error = e.message ?: "Import failed")
            }
        }
    }

    private fun col(idx: Int, row: List<String>) = if (idx >= 0) row.getOrNull(idx)?.trim()?.takeIf { it.isNotBlank() } else null
}

data class ImportUiState(
    val headers: List<String> = emptyList(),
    val rows: List<List<String>> = emptyList(),
    val mapping: ColumnMapper.Mapping = ColumnMapper.Mapping(-1, -1),
    val isImporting: Boolean = false,
    val importSuccess: Boolean = false,
    val importedCount: Int = 0,
    val error: String? = null
)
```

#### Import Modal UI

```kotlin
// presentation/components/ImportModal.kt
@Composable
fun ImportModal(
    setId: String, onDismiss: () -> Unit, onImportSuccess: (Int) -> Unit,
    viewModel: ImportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showMapping by remember { mutableStateOf(false) }
    var selectedMapping by remember { mutableStateOf(ColumnMapper.Mapping(-1, -1)) }
    val context = LocalContext.current

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
            Text("Import Cards", style = MaterialTheme.typography.titleLarge)
            Spacer(modifier = Modifier.height(16.dp))

            if (!showMapping) {
                // File picker
                Column(
                    modifier = Modifier.fillMaxWidth().height(200.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.CloudUpload, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    Text("Select CSV file")
                    Spacer(Modifier.height(12.dp))

                    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
                        uri?.let {
                            val content = context.contentResolver.openInputStream(it)?.bufferedReader()?.use { r -> r.readText() } ?: ""
                            val parsed = FileImportHelper.parseCsv(content)
                            if (parsed.headers.isNotEmpty()) {
                                selectedMapping = ColumnMapper.autoDetect(parsed.headers)
                                viewModel.setParsedData(parsed, selectedMapping)
                                showMapping = true
                            }
                        }
                    }
                    Button(onClick = { launcher.launch(arrayOf("text/csv", "*/*")) }) { Text("Browse Files") }
                }
            } else {
                // Column mapping
                ColumnMappingSection(
                    headers = uiState.headers, mapping = selectedMapping,
                    previewRows = uiState.rows.take(5),
                    onMappingChange = { selectedMapping = it; viewModel.updateMapping(it) },
                    totalRows = uiState.rows.size
                )
                Spacer(Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = { showMapping = false; viewModel.clearData() }, modifier = Modifier.weight(1f)) { Text("Change File") }
                    Button(
                        onClick = { viewModel.importCards(setId) }, modifier = Modifier.weight(1f),
                        enabled = selectedMapping.front >= 0 && selectedMapping.back >= 0 && !uiState.isImporting
                    ) {
                        if (uiState.isImporting) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                        else Text("Import ${uiState.rows.size} Cards")
                    }
                }
            }

            uiState.error?.let { error ->
                Spacer(Modifier.height(12.dp))
                Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
fun ColumnMappingSection(
    headers: List<String>, mapping: ColumnMapper.Mapping,
    previewRows: List<List<String>>, onMappingChange: (ColumnMapper.Mapping) -> Unit, totalRows: Int
) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Map Columns", style = MaterialTheme.typography.titleMedium)
            AssistChip(onClick = {}, label = { Text("$totalRows rows") }, leadingIcon = { Icon(Icons.Default.CheckCircle, null, Modifier.size(16.dp)) })
        }
        Spacer(Modifier.height(12.dp))

        val fields = listOf("Front *" to mapping.front, "Back *" to mapping.back, "Pronunciation" to mapping.pronunciation, "Example" to mapping.example, "Note" to mapping.note, "Collocation" to mapping.collocation, "Related Words" to mapping.relatedWords)
        fields.forEach { (label, selectedIdx) ->
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }, modifier = Modifier.weight(1.5f)) {
                    OutlinedTextField(
                        value = if (selectedIdx >= 0 && selectedIdx < headers.size) headers[selectedIdx] else "-- Select --",
                        onValueChange = {}, readOnly = true, modifier = Modifier.menuAnchor(),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        textStyle = MaterialTheme.typography.bodySmall
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        headers.forEachIndexed { idx, header ->
                            DropdownMenuItem(text = { Text(header.ifEmpty { "Column ${idx + 1}" }) }, onClick = {
                                val updated = when {
                                    label.startsWith("Front") -> mapping.copy(front = idx)
                                    label.startsWith("Back") -> mapping.copy(back = idx)
                                    label.startsWith("Pron") -> mapping.copy(pronunciation = idx)
                                    label.startsWith("Example") -> mapping.copy(example = idx)
                                    label.startsWith("Note") -> mapping.copy(note = idx)
                                    label.startsWith("Coll") -> mapping.copy(collocation = idx)
                                    else -> mapping.copy(relatedWords = idx)
                                }
                                onMappingChange(updated); expanded = false
                            })
                        }
                    }
                }
            }
        }

        if (previewRows.isNotEmpty()) {
            Spacer(Modifier.height(16.dp))
            Text("Preview (first 5 rows)", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))) {
                Column(modifier = Modifier.padding(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        headers.forEachIndexed { idx, header ->
                            Text(header.ifEmpty { "Col ${idx + 1}" }, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold,
                                color = when { idx == mapping.front -> QuizletGreen; idx == mapping.back -> QuizletBlue; else -> MaterialTheme.colorScheme.onSurface })
                        }
                    }
                    Divider(Modifier.padding(vertical = 4.dp))
                    previewRows.forEach { row ->
                        Row(modifier = Modifier.fillMaxWidth()) {
                            row.forEachIndexed { idx, cell ->
                                Text(cell.take(20), modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                    }
                }
            }
        }
    }
}
```

#### Add Import button vao SetDetailScreen

```kotlin
// SetDetailScreen.kt - trong Row cua button
OutlinedButton(onClick = { showImportModal = true }, modifier = Modifier.weight(1f)) {
    Icon(Icons.Default.CloudUpload, null)
    Spacer(Modifier.width(8.dp))
    Text("Import")
}
```

### Deliverable
Import modal giong Quizlet - chon file CSV, map columns, preview, import.

---

## :calendar: TASK 3 — XLSX Import

### Muc tieu
Mở rộng ImportModal đã có để hỗ trợ thêm định dạng XLSX.

#### XlsxImporter

```kotlin
// util/XlsxImporter.kt
import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.InputStream

object XlsxImporter {
    fun parseXlsx(inputStream: InputStream): FileImportHelper.CsvParseResult {
        val workbook = XSSFWorkbook(inputStream)
        val sheet = workbook.getSheetAt(0)
        val rows = mutableListOf<List<String>>()

        for (row in sheet) {
            val cells = mutableListOf<String>()
            for (cell in row) cells.add(getCellValue(cell))
            if (cells.any { it.isNotBlank() }) rows.add(cells)
        }
        workbook.close()

        if (rows.isEmpty()) return FileImportHelper.CsvParseResult(emptyList(), emptyList())
        return FileImportHelper.CsvParseResult(rows[0], rows.drop(1))
    }

    private fun getCellValue(cell: Cell): String = when (cell.cellType) {
        CellType.STRING -> cell.stringCellValue.trim()
        CellType.NUMERIC -> if (DateUtil.isCellDateFormatted(cell)) cell.localDateCellValue.toString() else {
            val num = cell.numericCellValue
            if (num == num.toLong().toDouble()) num.toLong().toString() else num.toString()
        }
        CellType.BOOLEAN -> cell.booleanCellValue.toString()
        CellType.BLANK -> ""
        else -> ""
    }
}
```

#### Cap nhat FileDropZone trong ImportModal

Thay `launcher.launch(arrayOf("text/csv", "*/*"))` thành:

```kotlin
val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
    uri?.let {
        val ext = it.lastPathSegment?.substringAfterLast(".")?.lowercase() ?: ""
        if (ext in listOf("xlsx", "xls")) {
            context.contentResolver.openInputStream(it)?.use { inputStream ->
                val parsed = XlsxImporter.parseXlsx(inputStream)
                if (parsed.headers.isNotEmpty()) {
                    selectedMapping = ColumnMapper.autoDetect(parsed.headers)
                    viewModel.setParsedData(parsed, selectedMapping)
                    showMapping = true
                }
            }
        } else {
            val content = context.contentResolver.openInputStream(it)?.bufferedReader()?.use { r -> r.readText() } ?: ""
            val parsed = FileImportHelper.parseCsv(content)
            if (parsed.headers.isNotEmpty()) {
                selectedMapping = ColumnMapper.autoDetect(parsed.headers)
                viewModel.setParsedData(parsed, selectedMapping)
                showMapping = true
            }
        }
    }
}
Button(onClick = { launcher.launch(arrayOf("text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "*/*")) }) { Text("Browse Files") }
```

Them text:

```kotlin
Text("Supports CSV, XLSX", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
```

### Deliverable
ImportModal ho tro ca CSV va XLSX.

---

## :calendar: TASK 4 — Collocation + RelatedWords (Backend)

### Muc tieu
Them 2 fields vao MongoDB model + controller.

#### Update Flashcard Model

```javascript
// server/src/models/flashcard.model.js
const flashcardSchema = new mongoose.Schema({
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    pronunciation: { type: String, default: null },
    example: { type: String, default: null },
    note: { type: String, default: null },
    collocation: { type: String, default: null },      // MOI THEM
    relatedWords: { type: String, default: null },    // MOI THEM
    imageUrl: { type: String, default: null },
    difficulty: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
```

#### Update Controller

```javascript
// server/src/modules/flashcard-sets/flashcard.controller.js

// Trong createCard - them collocation, relatedWords vao req.body destructuring
const { front, back, pronunciation, example, note, collocation, relatedWords, imageUrl } = req.body;
// ... trong Flashcard.create:
collocation: collocation || null,
relatedWords: relatedWords || null,

// Trong bulkCreateCards - map them 2 fields
const validCards = cards
    .filter((c) => c.front?.trim() && c.back?.trim())
    .map((c) => ({
        // ... cac field cu ...
        collocation: c.collocation || null,
        relatedWords: c.relatedWords || null,
    }));

// Trong updateCard - them 2 dong
if (collocation !== undefined) card.collocation = collocation || null;
if (relatedWords !== undefined) card.relatedWords = relatedWords || null;
```

#### Update CSV Import Endpoint (import-csv)

```javascript
// server/src/modules/flashcard-sets/flashcard.controller.js
// Them import-csv endpoint ho tro collocation + relatedWords

const importCsvCards = async (req, res) => {
    const { setId } = req.params;
    await requireOwner(setId, req.user._id);

    const { csvData } = req.body;
    if (!csvData) throw new AppError('csvData is required', 400);

    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new AppError('CSV must have headers and at least 1 data row', 400);

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const colFront = headers.findIndex(h => ['front','term','word','question'].includes(h));
    const colBack = headers.findIndex(h => ['back','definition','meaning','answer','translation'].includes(h));
    if (colFront === -1 || colBack === -1) throw new AppError('CSV must have "front" and "back" columns', 400);

    const colPron = headers.findIndex(h => ['pronunciation','pronounce'].includes(h));
    const colEx = headers.findIndex(h => ['example','sentence'].includes(h));
    const colNote = headers.findIndex(h => ['note','notes'].includes(h));
    const colColloc = headers.findIndex(h => ['collocation','collocations'].includes(h));
    const colRelated = headers.findIndex(h => ['relatedwords','related'].includes(h));

    const validCards = lines.slice(1)
        .map(line => {
            const cols = parseCSVLine(line);
            const front = cols[colFront]?.trim();
            const back = cols[colBack]?.trim();
            if (!front || !back) return null;
            return {
                set: setId, front, back,
                pronunciation: colPron !== -1 ? (cols[colPron]?.trim() || null) : null,
                example: colEx !== -1 ? (cols[colEx]?.trim() || null) : null,
                note: colNote !== -1 ? (cols[colNote]?.trim() || null) : null,
                collocation: colColloc !== -1 ? (cols[colColloc]?.trim() || null) : null,
                relatedWords: colRelated !== -1 ? (cols[colRelated]?.trim() || null) : null,
            };
        })
        .filter(Boolean);

    if (validCards.length === 0) throw new AppError('No valid cards found', 400);

    const created = await Flashcard.insertMany(validCards);
    await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: created.length } });
    res.status(201).json(ApiResponse.success({ imported: created.length, cards: created }, `${created.length} cards imported`));
};

// Them route trong flashcard.routes.js
router.post('/set/:setId/import-csv', authenticate, importCsvCards);
```

### Deliverable
Backend ho tro collocation + relatedWords trong model, create, update, bulk, import.

---

## :calendar: TASK 5 — Collocation + RelatedWords (Android)

### Muc tieu
Them 2 fields vao CardEditor screen.

#### Update FlashcardEntity

```kotlin
// data/local/entity/FlashcardEntity.kt
data class FlashcardEntity(
    // ... existing fields ...
    val collocation: String? = null,       // MOI THEM
    val relatedWords: String? = null,       // MOI THEM
)
```

#### Update FlashcardDto

```kotlin
// data/remote/dto/FlashcardDto.kt
@JsonClass(generateAdapter = true)
data class FlashcardDto(
    // ... existing fields ...
    @Json(name = "collocation") val collocation: String? = null,
    @Json(name = "relatedWords") val relatedWords: String? = null,
)

@JsonClass(generateAdapter = true)
data class CreateCardRequest(
    val front: String, val back: String,
    val pronunciation: String? = null, val example: String? = null,
    val note: String? = null,
    val collocation: String? = null,    // MOI THEM
    val relatedWords: String? = null   // MOI THEM
)

@JsonClass(generateAdapter = true)
data class BulkCreateCardsRequest(@Json(name = "cards") val cards: List<CreateCardRequest>)
```

#### Update CardEditorScreen

```kotlin
// presentation/cards/CardEditorScreen.kt
// Them 2 TextField trong Column, sau Example va truoc Note

var collocation by remember { mutableStateOf(uiState.collocation) }
var relatedWords by remember { mutableStateOf(uiState.relatedWords) }

// Sau Example field:
Spacer(Modifier.height(12.dp))
OutlinedTextField(
    value = collocation, onValueChange = { collocation = it },
    label = { Text("Collocation") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
    placeholder = { Text("make a decision, take a photo") }
)

Spacer(Modifier.height(12.dp))
OutlinedTextField(
    value = relatedWords, onValueChange = { relatedWords = it },
    label = { Text("Related Words") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
    placeholder = { Text("quick, fast, rapid") }
)
```

#### Update CardEditorViewModel

```kotlin
// presentation/cards/CardEditorViewModel.kt
data class CardEditorUiState(
    // ... existing fields ...
    val collocation: String? = null,
    val relatedWords: String? = null,
)

fun saveCard(front: String, back: String, pronunciation: String?, example: String?,
    note: String?, collocation: String?, relatedWords: String?) {
    viewModelScope.launch {
        val request = CreateCardRequest(
            front, back, pronunciation, example, note,
            collocation?.takeIf { it.isNotBlank() },
            relatedWords?.takeIf { it.isNotBlank() }
        )
        cardRepository.createCard(setId, request)
    }
}
```

#### Update CardRepository

```kotlin
// data/repository/CardRepositoryImpl.kt
suspend fun bulkCreateCards(setId: String, request: BulkCreateCardsRequest): List<Flashcard> {
    val response = cardApi.bulkCreateCards(setId, request)
    return response.data.map { dto ->
        val entity = dto.toEntity()
        flashcardDao.insertCard(entity)
        entity.toDomain()
    }
}
```

### Deliverable
Card Editor co 7 fields: front, back, pronunciation, example, collocation, relatedWords, note.

---

## :calendar: TASK 6 — Home Dashboard Polish

### Muc tieu
Fix Home screen hien thi du lieu that tu API, them animations.

#### Backend: Progress Summary API

```javascript
// server/src/modules/progress/progress.controller.js
const getProgressSummary = async (req, res) => {
    const userId = req.user._id;
    const totalCards = await CardProgress.countDocuments({ user: userId });
    const masteredCards = await CardProgress.countDocuments({
        user: userId,
        $expr: { $gte: [{ $multiply: ["$easeFactor", "$interval"] }, 30] }
    });
    const dueToday = await CardProgress.countDocuments({
        user: userId,
        nextReviewDate: { $lte: new Date() }
    });

    res.json(ApiResponse.success({ totalCards, masteredCards, dueToday }));
};

// route: router.get('/summary', authenticate, getProgressSummary);
```

#### HomeViewModel

```kotlin
// presentation/home/HomeViewModel.kt
data class HomeUiState(
    val user: User? = null, val streak: Int = 0, val xp: Int = 0,
    val level: Int = 1, val totalSets: Int = 0,
    val masteredCards: Int = 0, val dueToday: Int = 0,
    val isLoading: Boolean = true, val error: String? = null
)

fun loadData() {
    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(isLoading = true)
        try {
            val user = userRepository.getMe()
            val sets = setRepository.getMySets()
            val summary = progressRepository.getProgressSummary()
            _uiState.value = HomeUiState(
                user = user, streak = user?.streak?.current ?: 0,
                xp = user?.gamification?.xp ?: 0, level = user?.gamification?.level ?: 1,
                totalSets = sets.size, masteredCards = summary.masteredCards,
                dueToday = summary.dueToday, isLoading = false
            )
        } catch (e: Exception) {
            _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
        }
    }
}
```

#### HomeScreen Polish

```kotlin
// presentation/home/HomeScreen.kt
// Thay doi: hien thi dueToday, Mastered count that, Pull-to-refresh

val pullToRefreshState = rememberPullToRefreshState()
PullToRefreshBox(isRefreshing = uiState.isLoading, onRefresh = { viewModel.loadData() }, state = pullToRefreshState) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        // Welcome
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("Hello, ${uiState.user?.username ?: " Learner"}!", style = MaterialTheme.typography.headlineSmall)
                Text(if (uiState.dueToday > 0) "${uiState.dueToday} cards due today" else "You're all caught up!",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onNavigateToProfile) { Icon(Icons.Default.Person, "Profile") }
        }

        Spacer(Modifier.height(24.dp))

        // Stats 2x2
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("🔥", "${uiState.streak}", "Streak", Modifier.weight(1f))
            StatCard("⭐", "${uiState.xp}", "XP", Modifier.weight(1f))
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("📚", "${uiState.totalSets}", "Sets", Modifier.weight(1f))
            StatCard("✓", "${uiState.masteredCards}", "Mastered", Modifier.weight(1f))
        }

        // Due today banner
        if (uiState.dueToday > 0) {
            Spacer(Modifier.height(16.dp))
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = QuizletBlue.copy(alpha = 0.1f))) {
                Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("${uiState.dueToday} cards due", style = MaterialTheme.typography.titleMedium)
                        Text("Keep your streak going!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Button(onClick = onNavigateToStudy) { Text("Study Now") }
                }
            }
        }
    }
}
```

#### Streak Flame Animation

```kotlin
@Composable
fun StreakFlame(streak: Int, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "flame")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 1.15f,
        animationSpec = infiniteRepeatable(animation = tween(800, easing = FastOutSlowInEasing), repeatMode = RepeatMode.Reverse),
        label = "scale"
    )
    Box(modifier, contentAlignment = Alignment.Center) {
        Text("🔥", style = MaterialTheme.typography.displayMedium,
            modifier = Modifier.graphicsLayer { scaleX = scale; scaleY = scale },
            color = if (streak > 0) Color.Unspecified else Color.Unspecified.copy(alpha = 0.3f))
    }
}
```

### Deliverable
Home screen hoan chinh: dueToday, mastered count, streak animation, pull-to-refresh.

---

## :calendar: TASK 7 — Google Sign-In

### Muc tieu
Setup Google Sign-In tren Android.

#### Setup

1. Lay SHA-1 fingerprint: `cd android && ./gradlew signingReport`
2. Them vao Firebase Console / Google Cloud Console
3. Tao OAuth 2.0 Client ID (Web application type)

#### AndroidManifest

```xml
<!-- AndroidManifest.xml -->
<meta-data
    android:name="com.google.android.gms.version"
    android:value="@integer/google_play_services_version" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### strings.xml

```xml
<string name="default_web_client_id">YOUR_WEB_CLIENT_ID_FROM_GOOGLE_CLOUD</string>
```

#### LoginScreen

```kotlin
@Composable
fun LoginScreen(onNavigateToRegister: () -> Unit, onLoginSuccess: () -> Unit, viewModel: AuthViewModel = hiltViewModel()) {
    val signInState by viewModel.googleSignInState.collectAsState()

    LaunchedEffect(signInState) {
        if (signInState is SignInState.Success) onLoginSuccess()
    }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        // ... email/password fields ...

        Spacer(Modifier.height(24.dp))

        // Google button
        OutlinedButton(onClick = { startGoogleSignIn() }, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(8.dp)) {
            Image(painterResource(id = R.drawable.ic_google), "Google", modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(12.dp))
            Text("Sign in with Google", color = Color(0xFF757575))
        }

        when (val state = signInState) {
            is SignInState.Loading -> CircularProgressIndicator(Modifier.padding(16.dp))
            is SignInState.Error -> Text(state.message, color = MaterialTheme.colorScheme.error, Modifier.padding(16.dp))
            else -> {}
        }
    }
}
```

#### Google Sign-In Flow

```kotlin
// Trong ViewModel hoac Screen
private fun startGoogleSignIn() {
    val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestIdToken(context.getString(R.string.default_web_client_id))
        .requestEmail().build()
    val client = GoogleSignIn.getClient(context as Activity, gso)
    googleSignInLauncher.launch(client.signInIntent)
}

private val googleSignInLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
    val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
    task.addOnSuccessListener { account ->
        account.idToken?.let { viewModel.signInWithGoogle(it) }
    }.addOnFailureListener {
        // handle error
    }
}
```

#### AuthViewModel

```kotlin
fun signInWithGoogle(idToken: String) {
    viewModelScope.launch {
        _googleSignInState.value = SignInState.Loading
        authRepository.loginWithGoogle(idToken)
            .onSuccess { _googleSignInState.value = SignInState.Success(it) }
            .onFailure { _googleSignInState.value = SignInState.Error(it.message ?: "Error") }
    }
}
```

### Deliverable
Google Sign-In hoan chinh tren Android.

---

## :calendar: TASK 8 — Study Mode Integration

### Muc tieu
Ket noi Android voi backend SRS da co.

#### StudyApi

```kotlin
// data/remote/api/StudyApi.kt
interface StudyApi {
    @POST("study-sessions/{sessionId}/answer")
    suspend fun submitAnswer(
        @Path("sessionId") sessionId: String,
        @Body request: SubmitAnswerRequest
    ): ApiResponse<AnswerResult>

    @POST("study-sessions/{sessionId}/complete")
    suspend fun completeSession(
        @Path("sessionId") sessionId: String,
        @Body request: CompleteSessionRequest
    ): ApiResponse<SessionResult>
}

@JsonClass(generateAdapter = true)
data class SubmitAnswerRequest(
    @Json(name = "cardId") val cardId: String,
    @Json(name = "isCorrect") val isCorrect: Boolean
)
@JsonClass(generateAdapter = true) data class AnswerResult(
    @Json(name = "nextReviewDate") val nextReviewDate: String?,
    @Json(name = "correctStreak") val correctStreak: Int
)
@JsonClass(generateAdapter = true)
data class CompleteSessionRequest(@Json(name = "durationMs") val durationMs: Long)
```

#### StudyRepository

```kotlin
suspend fun submitAnswer(sessionId: String, cardId: String, isCorrect: Boolean): AnswerResult =
    studyApi.submitAnswer(sessionId, SubmitAnswerRequest(cardId, isCorrect)).data

suspend fun completeSession(sessionId: String, durationMs: Long) =
    studyApi.completeSession(sessionId, CompleteSessionRequest(durationMs)).data
```

#### StudyViewModel Update

```kotlin
private fun answerCard(answer: StudyAnswer) {
    val currentCard = _state.value.currentCard ?: return
    val sessionId = _state.value.sessionId ?: return

    viewModelScope.launch {
        val isCorrect = answer.value >= StudyAnswer.GOOD.value
        try {
            studyRepository.submitAnswer(sessionId, currentCard.id, isCorrect)
        } catch (_: Exception) { /* offline - continue */ }

        _state.update { it.copy(
            correctCount = if (isCorrect) it.correctCount + 1 else it.correctCount,
            incorrectCount = if (!isCorrect) it.incorrectCount + 1 else it.incorrectCount,
        ) }
        delay(300)
        nextCard()
    }
}

private fun finishSession() {
    val sessionId = _state.value.sessionId ?: return
    viewModelScope.launch {
        try {
            studyRepository.completeSession(sessionId, System.currentTimeMillis() - _state.value.startTime)
        } catch (_: Exception) { /* offline */ }
    }
}
```

#### FlashcardStudyScreen - Hien thi collocation + relatedWords khi flip

```kotlin
// Trong FlashcardsModeView, phan back-side, sau example:
cards[currentIndex].collocation?.takeIf { it.isNotBlank() }?.let {
    Spacer(Modifier.height(12.dp))
    Surface(color = QuizletGreen.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Link, null, Modifier.size(14.dp), tint = QuizletGreen)
            Spacer(Modifier.width(6.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = QuizletGreen, fontWeight = FontWeight.Medium)
        }
    }
}

cards[currentIndex].relatedWords?.takeIf { it.isNotBlank() }?.let {
    Spacer(Modifier.height(8.dp))
    Surface(color = QuizletBlue.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.FlashOn, null, Modifier.size(14.dp), tint = QuizletBlue)
            Spacer(Modifier.width(6.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = QuizletBlue, fontWeight = FontWeight.Medium)
        }
    }
}
```

### Deliverable
Study mode ket noi voi backend SRS, hien thi collocation + relatedWords.

---

## :checklist: Week 3 Checklist

| # | Checkpoint | Status |
|---|-----------|--------|
| 1 | Export CSV (CsvExporter + ExportBottomSheet) | :black_square_button: |
| 2 | Export button in SetDetailScreen | :black_square_button: |
| 3 | CSV Parser (FileImportHelper) | :black_square_button: |
| 4 | Column Mapper (auto-detect) | :black_square_button: |
| 5 | ImportViewModel (call bulk API) | :black_square_button: |
| 6 | ImportModal UI (drop zone + mapping + preview) | :black_square_button: |
| 7 | Import button in SetDetailScreen | :black_square_button: |
| 8 | XLSX Import (XlsxImporter + Apache POI) | :black_square_button: |
| 9 | Backend: collocation + relatedWords in model | :black_square_button: |
| 10 | Backend: controller update (create/update/bulk/import-csv) | :black_square_button: |
| 11 | FlashcardEntity: Add 2 fields | :black_square_button: |
| 12 | FlashcardDto: Add 2 fields + BulkCreateCardsRequest | :black_square_button: |
| 13 | CardEditorScreen: Add 2 new fields | :black_square_button: |
| 14 | CardEditorViewModel: Handle 2 new fields | :black_square_button: |
| 15 | CardRepository: bulkCreateCards method | :black_square_button: |
| 16 | Backend: Progress summary API | :black_square_button: |
| 17 | HomeViewModel: Load real progress data | :black_square_button: |
| 18 | HomeScreen: Due today banner | :black_square_button: |
| 19 | HomeScreen: Pull-to-refresh | :black_square_button: |
| 20 | Streak flame animation | :black_square_button: |
| 21 | Google Sign-In setup + button | :black_square_button: |
| 22 | StudyApi: submitAnswer + completeSession | :black_square_button: |
| 23 | StudyViewModel: integrate with backend SRS | :black_square_button: |
| 24 | FlashcardStudyScreen: show collocation + relatedWords | :black_square_button: |

---

## :scroll: App Structure (Week 3 additions)

```
android/app/src/main/java/com/example/smartenglish/
├── presentation/
│   ├── auth/AuthViewModel.kt (update - Google Sign-In)
│   ├── cards/CardEditorScreen.kt (update - 2 fields)
│   ├── cards/CardEditorViewModel.kt (update - 2 fields)
│   ├── components/
│   │   ├── ImportModal.kt (NEW)
│   │   └── ImportViewModel.kt (NEW)
│   ├── home/HomeScreen.kt (update - polish)
│   ├── home/HomeViewModel.kt (update - real data)
│   ├── sets/
│   │   ├── SetDetailScreen.kt (update - Import/Export buttons)
│   │   └── ExportBottomSheet.kt (NEW)
│   └── components/FlameAnimation.kt (NEW)
├── data/repository/CardRepositoryImpl.kt (update - bulk create)
└── util/
    ├── FileImportHelper.kt (NEW)
    ├── ColumnMapper.kt (NEW)
    ├── CsvExporter.kt (NEW)
    └── XlsxImporter.kt (NEW)
```
