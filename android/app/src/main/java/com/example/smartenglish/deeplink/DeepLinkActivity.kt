package com.example.smartenglish.deeplink

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartenglish.MainActivity
import com.example.smartenglish.data.remote.dto.CreateCardRequest
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.domain.repository.ShareRepository
import com.example.smartenglish.ui.theme.SmartEnglishTheme
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

// Premium Colors to match SetDetailScreen
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)

@AndroidEntryPoint
class DeepLinkActivity : ComponentActivity() {

    @Inject
    lateinit var shareRepository: ShareRepository

    @Inject
    lateinit var setRepository: SetRepository

    @Inject
    lateinit var cardRepository: CardRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val shareCode = intent?.data?.lastPathSegment ?: ""

        setContent {
            SmartEnglishTheme {
                DeepLinkScreen(
                    shareCode = shareCode,
                    setRepository = setRepository,
                    cardRepository = cardRepository,
                    shareRepository = shareRepository,
                    onNavigateToHome = {
                        val mainIntent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        startActivity(mainIntent)
                        finish()
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeepLinkScreen(
    shareCode: String,
    setRepository: SetRepository,
    cardRepository: CardRepository,
    shareRepository: ShareRepository,
    onNavigateToHome: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var set by remember { mutableStateOf<FlashcardSet?>(null) }
    var cards by remember { mutableStateOf<List<Flashcard>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var isCloning by remember { mutableStateOf(false) }

    fun isValidObjectId(id: String): Boolean {
        return id.length == 24 && id.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }
    }

    LaunchedEffect(shareCode) {
        if (shareCode.isBlank()) {
            error = "Liên kết chia sẻ không hợp lệ"
            isLoading = false
            return@LaunchedEffect
        }
        isLoading = true
        error = null

        val isObjectId = isValidObjectId(shareCode)
        val result = if (isObjectId) {
            setRepository.getSetById(shareCode)
        } else {
            shareRepository.getSharedSet(shareCode)
        }

        when (result) {
            is ApiResult.Success -> {
                val fetchedSet = result.data
                set = fetchedSet
                try {
                    val fetchedCards = cardRepository.getCardsBySetList(fetchedSet.id)
                    cards = fetchedCards
                } catch (e: Exception) {
                    android.util.Log.e("DeepLinkActivity", "Failed to fetch cards: ${e.message}")
                }
            }
                        is ApiResult.Error -> {
                error = result.message ?: "Không thể tải bộ thẻ. Vui lòng kiểm tra lại liên kết hoặc đăng nhập lại."
            }
            else -> {
                error = "Không thể tải bộ thẻ"
            }
        }
        isLoading = false
    }

    fun cloneSet() {
        val currentSet = set ?: return
        isCloning = true
        scope.launch {
            val title = "${currentSet.title} (Copy)"
            val description = currentSet.description
            val language = currentSet.language
            val isPublic = false
            
            // Extract tags if any
            val tags = try {
                currentSet.tags ?: emptyList()
            } catch (e: Exception) {
                emptyList<String>()
            }
            
            when (val createResult = setRepository.createSet(title, description, language, isPublic, tags)) {
                is ApiResult.Success -> {
                    val newSet = createResult.data
                    if (cards.isNotEmpty()) {
                        val cardRequests = cards.map {
                            CreateCardRequest(
                                front = it.front,
                                back = it.back,
                                pronunciation = it.pronunciation,
                                example = it.example,
                                note = it.note,
                                collocation = it.collocation,
                                relatedWords = it.relatedWords,
                                imageUrl = it.imageUrl
                            )
                        }
                        cardRepository.bulkCreateCards(newSet.id, cardRequests)
                    }
                    
                    Toast.makeText(context, "Đã lưu bộ thẻ thành công vào thư viện!", Toast.LENGTH_LONG).show()
                    
                    // Navigate to set detail in MainActivity
                    val mainIntent = Intent(context, MainActivity::class.java).apply {
                        putExtra("SET_ID", newSet.id)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    context.startActivity(mainIntent)
                    (context as? ComponentActivity)?.finish()
                }
                is ApiResult.Error -> {
                    Toast.makeText(context, "Lỗi khi lưu bộ thẻ: ${createResult.message}", Toast.LENGTH_LONG).show()
                }
                else -> {
                    Toast.makeText(context, "Đã xảy ra lỗi không xác định", Toast.LENGTH_LONG).show()
                }
            }
            isCloning = false
        }
    }

    fun studyNow() {
        val currentSet = set ?: return
        // Open set in MainActivity directly
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            putExtra("SET_ID", currentSet.id)
            putExtra("STUDY_MODE", "flashcards")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(mainIntent)
        (context as? ComponentActivity)?.finish()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DeepDarkNavy, DarkBackground)
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = { Text("Bộ thẻ chia sẻ", color = Color.White) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateToHome) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White
                    )
                )
            }
        ) { paddingValues ->
            when {
                isLoading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = QuizletBlue)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Đang tải dữ liệu bộ thẻ...", color = TextWhite)
                        }
                    }
                }
                error != null -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = QuizletCoral
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = error ?: "Đã xảy ra lỗi",
                                color = TextWhite,
                                style = MaterialTheme.typography.titleMedium,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = onNavigateToHome,
                                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
                            ) {
                                Text("Quay lại Trang chủ")
                            }
                        }
                    }
                }
                set != null -> {
                    val currentSet = set!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues)
                            .padding(horizontal = 20.dp)
                    ) {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                // Title
                                Text(
                                    text = currentSet.title,
                                    color = TextWhite,
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold,
                                    lineHeight = 34.sp
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                // Creator details
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .background(Color.White.copy(alpha = 0.08f), CircleShape)
                                            .border(1.dp, Color.White.copy(alpha = 0.15f), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        val userName = currentSet.userName ?: "User"
                                        val initials = if (userName.isNotEmpty()) userName.take(1).uppercase() else "?"
                                        Text(
                                            text = initials,
                                            color = Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Text(
                                        text = currentSet.userName ?: "Người dùng",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium
                                    )

                                    Box(
                                        modifier = Modifier
                                            .width(1.dp)
                                            .height(14.dp)
                                            .background(Color.White.copy(alpha = 0.2f))
                                    )

                                    Text(
                                        text = "${cards.size} thuật ngữ",
                                        color = TextGray,
                                        fontSize = 14.sp
                                    )
                                }

                                if (!currentSet.description.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = currentSet.description!!,
                                        color = TextGray,
                                        fontSize = 15.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(20.dp))
                            }

                            // Flashcards listing
                            items(cards) { card ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = CardBg)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(20.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Text(
                                            text = card.front,
                                            color = Color.White,
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.Bold
                                        )

                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(1.dp)
                                                .background(Color.White.copy(alpha = 0.08f))
                                        )

                                        Text(
                                            text = card.back,
                                            color = TextGray,
                                            fontSize = 15.sp
                                        )
                                    }
                                }
                            }

                            item {
                                Spacer(modifier = Modifier.height(16.dp))
                            }
                        }

                        // Bottom Actions
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { cloneSet() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                                shape = RoundedCornerShape(24.dp),
                                enabled = !isCloning
                            ) {
                                if (isCloning) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(Icons.Default.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Lưu về thư viện của tôi", fontWeight = FontWeight.Bold)
                                }
                            }

                            OutlinedButton(
                                onClick = { studyNow() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(24.dp)),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                shape = RoundedCornerShape(24.dp),
                                enabled = !isCloning
                            ) {
                                Icon(Icons.Default.School, contentDescription = null, tint = Color.White)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Học bộ thẻ này ngay", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
