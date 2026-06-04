package com.example.smartenglish.presentation.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.User

private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val CardBg = Color(0xFF161A3F)
private val CardBgSoft = Color(0xFF1A1F46)
private val QuizletBlue = Color(0xFF4255FF)
private val TextGray = Color(0xFF94A3B8)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)
private val DangerRed = Color(0xFFFF5A5F)
private val SuccessGreen = Color(0xFF22C55E)
private val WarningAmber = Color(0xFFF59E0B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(
    onNavigateBack: () -> Unit,
    viewModel: UserManagementViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error, state.actionMessage) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
        state.actionMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        contentWindowInsets = WindowInsets.navigationBars,
        topBar = {
            TopAppBar(
                title = {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = "Quản lý người dùng",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Admin console",
                            color = TextGray,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refresh) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(DeepDarkNavy, DarkBackground)
                    )
                )
                .padding(paddingValues)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    AdminHeaderSection(
                        totalUsers = state.totalUsers,
                        currentPage = state.currentPage,
                        totalPages = state.totalPages
                    )
                }

                item {
                    AdminMetricsRow(state = state)
                }

                item {
                    AdminToolbar(
                        state = state,
                        onSearchQueryChange = viewModel::updateSearchQuery,
                        onRoleSelected = viewModel::updateRoleFilter,
                        onRefresh = viewModel::refresh
                    )
                }

                item {
                    AdminResultSummary(
                        state = state,
                        onLoadMore = viewModel::loadNextPage
                    )
                }

                when {
                    state.isLoading && !state.hasLoadedOnce -> {
                        items(4) {
                            UserRowSkeleton()
                        }
                    }

                    state.users.isEmpty() -> {
                        item {
                            EmptyAdminState(
                                isError = state.error != null,
                                onRetry = viewModel::refresh
                            )
                        }
                    }

                    else -> {
                        items(state.users, key = { it.id }) { user ->
                            AdminUserRowCard(
                                user = user,
                                onClick = { viewModel.loadUserDetail(user.id) }
                            )
                        }

                        item {
                            AdminPaginationFooter(
                                state = state,
                                onLoadMore = viewModel::loadNextPage
                            )
                        }
                    }
                }
            }

            if (state.isRefreshing) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
                    color = QuizletBlue
                )
            }
        }
    }

    if (state.selectedUser != null || state.isDetailLoading) {
        UserManagementDetailDialog(
            user = state.selectedUser,
            isLoading = state.isDetailLoading,
            isUpdatingPremium = state.isUpdatingPremium,
            isDeletingUser = state.isDeletingUser,
            onDismiss = viewModel::dismissUserDetail,
            onUpdatePremium = viewModel::updateSelectedUserPremium,
            onDeleteUser = viewModel::deleteSelectedUser
        )
    }
}

@Composable
private fun AdminHeaderSection(
    totalUsers: Int,
    currentPage: Int,
    totalPages: Int
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color.Transparent,
        tonalElevation = 0.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(QuizletBlue.copy(alpha = 0.28f), CardBg)
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .background(Color.White.copy(alpha = 0.08f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AdminPanelSettings,
                            contentDescription = null,
                            tint = IconCyan,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Admin console production",
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 22.sp
                        )
                        Text(
                            text = "Tra cứu nhanh, kiểm soát premium và trạng thái người dùng theo cách dễ scan hơn.",
                            color = TextGray,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    AssistChip(
                        onClick = {},
                        enabled = false,
                        label = { Text("$totalUsers người dùng") },
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null)
                        },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = Color.White.copy(alpha = 0.08f),
                            labelColor = Color.White,
                            leadingIconContentColor = IconCyan,
                            disabledContainerColor = Color.White.copy(alpha = 0.08f),
                            disabledLabelColor = Color.White,
                            disabledLeadingIconContentColor = IconCyan
                        )
                    )
                    AssistChip(
                        onClick = {},
                        enabled = false,
                        label = { Text("Trang $currentPage/$totalPages") },
                        leadingIcon = {
                            Icon(Icons.Default.Shield, contentDescription = null)
                        },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = Color.White.copy(alpha = 0.08f),
                            labelColor = Color.White,
                            leadingIconContentColor = WarningAmber,
                            disabledContainerColor = Color.White.copy(alpha = 0.08f),
                            disabledLabelColor = Color.White,
                            disabledLeadingIconContentColor = WarningAmber
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminMetricsRow(state: UserManagementState) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        MetricCard(
            modifier = Modifier.weight(1f),
            title = "Premium",
            value = state.totalPremiumUsers.toString(),
            subtitle = "toàn bộ người dùng",
            icon = Icons.Default.Star,
            accent = WarningAmber
        )
        MetricCard(
            modifier = Modifier.weight(1f),
            title = "Verified",
            value = state.totalVerifiedUsers.toString(),
            subtitle = "toàn bộ người dùng",
            icon = Icons.Default.Verified,
            accent = SuccessGreen
        )
        MetricCard(
            modifier = Modifier.weight(1f),
            title = "Tổng user",
            value = state.totalUsers.toString(),
            subtitle = "trên tất cả trang",
            icon = Icons.Default.Person,
            accent = IconCyan
        )
    }
}

@Composable
private fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accent: Color
) {
    ElevatedCard(
        modifier = modifier,
        colors = androidx.compose.material3.CardDefaults.elevatedCardColors(
            containerColor = CardBgSoft
        ),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .background(accent.copy(alpha = 0.14f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(20.dp))
            }
            Text(text = title, color = TextGray, style = MaterialTheme.typography.bodySmall)
            Text(text = value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            Text(text = subtitle, color = TextGray, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun AdminToolbar(
    state: UserManagementState,
    onSearchQueryChange: (String) -> Unit,
    onRoleSelected: (AdminRoleFilter) -> Unit,
    onRefresh: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Tìm theo email hoặc username") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null)
            },
            singleLine = true,
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White.copy(alpha = 0.03f),
                unfocusedContainerColor = Color.White.copy(alpha = 0.03f),
                focusedBorderColor = QuizletBlue,
                unfocusedBorderColor = Color.White.copy(alpha = 0.08f),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedPlaceholderColor = TextGray,
                unfocusedPlaceholderColor = TextGray,
                focusedLeadingIconColor = IconCyan,
                unfocusedLeadingIconColor = IconCyan
            )
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AdminRoleFilter.entries.forEach { filter ->
                FilterChip(
                    selected = state.selectedRoleFilter == filter,
                    onClick = { onRoleSelected(filter) },
                    label = { Text(filter.displayName) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = QuizletBlue,
                        selectedLabelColor = Color.White,
                        containerColor = Color.White.copy(alpha = 0.06f),
                        labelColor = Color.White
                    )
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (state.searchQuery.isBlank()) {
                    "Danh sách đã sẵn sàng để rà soát"
                } else {
                    "Đang lọc theo “${state.searchQuery}”"
                },
                color = TextGray,
                style = MaterialTheme.typography.bodySmall
            )
            TextButton(
                onClick = onRefresh,
                colors = ButtonDefaults.textButtonColors(contentColor = IconCyan)
            ) {
                Text("Làm mới")
            }
        }
    }
}

@Composable
private fun AdminResultSummary(
    state: UserManagementState,
    onLoadMore: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = state.resultRangeText,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Role: ${state.selectedRoleFilter.displayName}",
                    color = TextGray,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (state.currentPage < state.totalPages && state.users.isNotEmpty()) {
                TextButton(onClick = onLoadMore, enabled = !state.isLoadingMore) {
                    Text(if (state.isLoadingMore) "Đang tải..." else "Tải thêm")
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AdminUserRowCard(
    user: User,
    onClick: () -> Unit
) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .clickable(onClick = onClick),
        colors = androidx.compose.material3.CardDefaults.elevatedCardColors(
            containerColor = CardBg
        ),
        shape = RoundedCornerShape(22.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(IconBg, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = IconCyan,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = user.username,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = user.email,
                        color = TextGray,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                AssistChip(
                    onClick = onClick,
                    label = { Text("Chi tiết") },
                    leadingIcon = {
                        Icon(Icons.Default.Shield, contentDescription = null)
                    },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = QuizletBlue.copy(alpha = 0.12f),
                        labelColor = Color.White,
                        leadingIconContentColor = IconCyan
                    )
                )
            }

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                UserMetaChip(
                    label = user.role.replaceFirstChar { it.uppercase() },
                    accent = if (user.role.equals("admin", ignoreCase = true)) IconCyan else QuizletBlue
                )
                UserMetaChip(
                    label = user.premium.replaceFirstChar { it.uppercase() },
                    accent = if (user.premium.equals("premium", ignoreCase = true)) WarningAmber else QuizletBlue
                )
                UserMetaChip(
                    label = if (user.isVerified) "Verified" else "Unverified",
                    accent = if (user.isVerified) SuccessGreen else TextGray
                )
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Tạo từ ${formatDate(user.createdAt ?: "-")}",
                    color = TextGray,
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Mở để chỉnh premium hoặc xóa",
                    color = TextGray,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
private fun AdminPaginationFooter(
    state: UserManagementState,
    onLoadMore: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        when {
            state.isLoadingMore -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = QuizletBlue,
                    strokeWidth = 2.5.dp
                )
            }
            state.currentPage < state.totalPages -> {
                Button(
                    onClick = onLoadMore,
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Tải thêm người dùng", color = Color.White)
                }
            }
            else -> {
                Text(
                    text = "Bạn đã xem hết danh sách hiện có",
                    color = TextGray,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun UserRowSkeleton() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = CardBgSoft
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(Color.White.copy(alpha = 0.06f), CircleShape)
                )
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.45f)
                            .height(14.dp)
                            .background(Color.White.copy(alpha = 0.06f), RoundedCornerShape(999.dp))
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.7f)
                            .height(12.dp)
                            .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(999.dp))
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(12.dp)
                    .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(999.dp))
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UserManagementDetailDialog(
    user: User?,
    isLoading: Boolean,
    isUpdatingPremium: Boolean,
    isDeletingUser: Boolean,
    onDismiss: () -> Unit,
    onUpdatePremium: (String) -> Unit,
    onDeleteUser: () -> Unit
) {
    var pendingDelete by rememberSaveable { mutableStateOf(false) }
    var premiumExpanded by remember { mutableStateOf(false) }
    var selectedPremium by remember(user?.premium) { mutableStateOf(user?.premium ?: "free") }
    val premiumOptions = listOf("free", "trial", "premium")

    AlertDialog(
        containerColor = Color(0xFFF8FAFC),
        tonalElevation = 0.dp,
        onDismissRequest = {
            if (!isDeletingUser && !isUpdatingPremium) {
                pendingDelete = false
                onDismiss()
            }
        },
        title = {
            Text(
                text = if (isLoading) "Đang tải thông tin..." else "Chi tiết người dùng",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            if (isLoading || user == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = QuizletBlue)
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = CardBgSoft
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            DetailRow(icon = Icons.Default.Person, label = "Username", value = user.username)
                            DetailRow(icon = Icons.Default.Email, label = "Email", value = user.email)
                            DetailRow(icon = Icons.Default.Shield, label = "Role", value = user.role.replaceFirstChar { it.uppercase() })
                            DetailRow(
                                icon = Icons.Default.Verified,
                                label = "Trạng thái",
                                value = if (user.isVerified) "Verified" else "Unverified"
                            )
                            DetailRow(icon = Icons.Default.Refresh, label = "Ngày tạo", value = formatDate(user.createdAt ?: "-"))
                        }
                    }

                    Text(
                        text = "Cập nhật Premium",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )

                    ExposedDropdownMenuBox(
                        expanded = premiumExpanded,
                        onExpandedChange = { premiumExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedPremium.replaceFirstChar { it.uppercase() },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Premium") },
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(expanded = premiumExpanded)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White,
                                focusedBorderColor = QuizletBlue,
                                unfocusedBorderColor = Color(0xFFCBD5E1),
                                focusedTextColor = Color(0xFF0F172A),
                                unfocusedTextColor = Color(0xFF0F172A),
                                focusedLabelColor = QuizletBlue,
                                unfocusedLabelColor = Color(0xFF475569),
                                focusedTrailingIconColor = QuizletBlue,
                                unfocusedTrailingIconColor = Color(0xFF475569)
                            )
                        )
                        ExposedDropdownMenu(
                            expanded = premiumExpanded,
                            onDismissRequest = { premiumExpanded = false }
                        ) {
                            premiumOptions.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option.replaceFirstChar { it.uppercase() }, color = Color(0xFF0F172A)) },
                                    onClick = {
                                        selectedPremium = option
                                        premiumExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Button(
                        onClick = { onUpdatePremium(selectedPremium) },
                        enabled = !isUpdatingPremium && selectedPremium != user.premium,
                        colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (isUpdatingPremium) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text("Lưu Premium", color = Color.White)
                    }

                    HorizontalDivider()

                    if (!pendingDelete) {
                        TextButton(
                            onClick = { pendingDelete = true },
                            colors = ButtonDefaults.textButtonColors(contentColor = DangerRed)
                        ) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Xóa người dùng")
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = DangerRed.copy(alpha = 0.12f)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = "Bạn có chắc muốn xóa user này không? Hành động này không thể hoàn tác.",
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    TextButton(
                                        onClick = { pendingDelete = false },
                                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFF475569))
                                    ) {
                                        Text("Hủy")
                                    }
                                    TextButton(
                                        onClick = onDeleteUser,
                                        enabled = !isDeletingUser,
                                        colors = ButtonDefaults.textButtonColors(contentColor = DangerRed)
                                    ) {
                                        if (isDeletingUser) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(16.dp),
                                                strokeWidth = 2.dp,
                                                color = DangerRed
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                        }
                                        Text("Xác nhận xóa")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (!isLoading) {
                TextButton(
                    onClick = onDismiss,
                    enabled = !isDeletingUser && !isUpdatingPremium,
                    colors = ButtonDefaults.textButtonColors(contentColor = QuizletBlue)
                ) {
                    Text("Đóng")
                }
            }
        },
        dismissButton = {}
    )
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .background(IconBg, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = IconCyan, modifier = Modifier.size(18.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(text = label, color = Color(0xFF475569), style = MaterialTheme.typography.bodySmall)
            Text(text = value, color = Color(0xFF0F172A), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun UserMetaChip(
    label: String,
    accent: Color = QuizletBlue
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = accent.copy(alpha = 0.14f)
    ) {
        Text(
            text = label,
            color = Color.White,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun EmptyAdminState(
    isError: Boolean,
    onRetry: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = CardBg
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = if (isError) Icons.Default.Refresh else Icons.Default.Person,
                contentDescription = null,
                tint = TextGray,
                modifier = Modifier.size(52.dp)
            )
            Text(
                text = if (isError) "Không tải được danh sách người dùng" else "Không tìm thấy người dùng phù hợp",
                color = Color.White,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = if (isError) {
                    "Kiểm tra kết nối hoặc thử tải lại để đồng bộ dữ liệu quản trị."
                } else {
                    "Thử đổi từ khóa tìm kiếm hoặc bộ lọc role để mở rộng kết quả."
                },
                color = TextGray,
                style = MaterialTheme.typography.bodySmall
            )
            if (isError) {
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Thử lại", color = Color.White)
                }
            }
        }
    }
}

private fun formatDate(value: String): String {
    return value.substringBefore("T").ifBlank { value }
}
