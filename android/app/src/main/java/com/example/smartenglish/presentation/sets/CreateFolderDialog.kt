package com.example.smartenglish.presentation.sets

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateFolderDialog(
    onDismiss: () -> Unit,
    onCreated: () -> Unit,
    viewModel: FolderViewModel = hiltViewModel()
) {
    var name by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.isCreateFolderSuccess) {
        if (state.isCreateFolderSuccess) {
            viewModel.onEvent(FolderEvent.ClearCreateFolderSuccess)
            onCreated()
        }
    }

    AlertDialog(
        onDismissRequest = {
            if (!state.isLoading) {
                onDismiss()
            }
        },
        title = {
            Text(
                text = "Tạo thư mục mới",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        },
        containerColor = Color(0xFF161A3F), // Theme background
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        if (error != null) error = null
                    },
                    label = { Text("Tên thư mục *") },
                    placeholder = { Text("Nhập tên thư mục...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !state.isLoading,
                    isError = error != null || state.error != null,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF4255FF),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                        focusedLabelColor = Color(0xFF4255FF),
                        unfocusedLabelColor = Color.White.copy(alpha = 0.5f),
                        focusedPlaceholderColor = Color.White.copy(alpha = 0.35f),
                        unfocusedPlaceholderColor = Color.White.copy(alpha = 0.35f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                val errorMessage = error ?: state.error
                errorMessage?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isBlank()) {
                        error = "Vui lòng nhập tên thư mục"
                        return@Button
                    }
                    viewModel.onEvent(FolderEvent.CreateFolder(name.trim()))
                },
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4255FF),
                    disabledContainerColor = Color(0xFF4255FF).copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(50.dp),
                modifier = Modifier
                    .height(44.dp)
                    .padding(horizontal = 8.dp)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = Color.White
                    )
                } else {
                    Text(
                        text = "Tạo thư mục",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !state.isLoading,
                modifier = Modifier.height(44.dp)
            ) {
                Text(
                    text = "Hủy",
                    color = Color.White.copy(alpha = 0.6f),
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp
                )
            }
        }
    )
}
