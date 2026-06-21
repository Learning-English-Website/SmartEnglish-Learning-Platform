import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatPage from '../pages/Duolingo/ChatPage';
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useAudio';
import { aiService } from '../api/aiService';

// Mock the audio hooks
vi.mock('../hooks/useAudio', () => ({
  useSpeechSynthesis: vi.fn(),
  useSpeechRecognition: vi.fn(),
  default: vi.fn()
}));

// Mock the AI service
vi.mock('../api/aiService', () => ({
  aiService: {
    getAiKeyStatus: vi.fn(),
    getChatSessions: vi.fn(),
    getChatMessages: vi.fn(),
  }
}));

describe('ChatPage Speech UI integration', () => {
  const mockStartListening = vi.fn();
  const mockStopListening = vi.fn();
  const mockAbortListening = vi.fn();
  const mockSpeak = vi.fn();
  const mockStopTTS = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    useSpeechSynthesis.mockReturnValue({
      speak: mockSpeak,
      stop: mockStopTTS,
      isSpeaking: false,
      isSupported: true,
      voices: []
    });

    useSpeechRecognition.mockReturnValue({
      isListening: false,
      transcript: '',
      error: null,
      isSupported: true,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      abortListening: mockAbortListening,
    });

    aiService.getAiKeyStatus.mockResolvedValue({ hasGeminiKey: true });
    aiService.getChatSessions.mockResolvedValue({
      success: true,
      sessions: [
        { _id: 'session-123', persona: 'barista', topic: 'Ordering coffee', level: 'B1-B2' }
      ]
    });
    aiService.getChatMessages.mockResolvedValue({
      success: true,
      messages: [
        { _id: 'msg-1', sender: 'ai', text: 'Hello, how can I help you today?', translation: 'Xin chào, tôi có thể giúp gì cho bạn?' }
      ]
    });
  });

  it('renders fallback warning when STT is not supported', async () => {
    useSpeechRecognition.mockReturnValue({
      isListening: false,
      transcript: '',
      error: null,
      isSupported: false,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      abortListening: mockAbortListening,
    });

    const { container } = render(<ChatPage />);

    // Wait for the session to load and click it to open the workspace
    await screen.findByText('Phòng đã tham gia');
    const sessionItem = container.querySelector('.session-item-row');
    fireEvent.click(sessionItem);

    // Verify STT unsupported warning is displayed
    const warning = await screen.findByText(/không hỗ trợ nhận diện giọng nói/i);
    expect(warning).toBeInTheDocument();

    // Verify mic button is not rendered
    expect(screen.queryByTitle(/nói để nhập liệu/i)).not.toBeInTheDocument();
  });

  it('renders microphone button and handles click when STT is supported', async () => {
    const { container } = render(<ChatPage />);

    // Open the workspace
    await screen.findByText('Phòng đã tham gia');
    const sessionItem = container.querySelector('.session-item-row');
    fireEvent.click(sessionItem);

    // Verify mic button is rendered
    const micBtn = await screen.findByTitle(/nói để nhập liệu/i);
    expect(micBtn).toBeInTheDocument();

    // Verify privacy warning is rendered
    const privacyNotice = screen.getByText(/Tính năng nhập giọng nói yêu cầu kết nối Internet/i);
    expect(privacyNotice).toBeInTheDocument();

    // Click mic button to start listening
    fireEvent.click(micBtn);
    expect(mockStartListening).toHaveBeenCalled();
  });

  it('shows active recording state when listening is true', async () => {
    useSpeechRecognition.mockReturnValue({
      isListening: true,
      transcript: '',
      error: null,
      isSupported: true,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      abortListening: mockAbortListening,
    });

    const { container } = render(<ChatPage />);

    // Open the workspace
    await screen.findByText('Phòng đã tham gia');
    const sessionItem = container.querySelector('.session-item-row');
    fireEvent.click(sessionItem);

    // Verify pulse-mic class is applied
    const activeMicBtn = await screen.findByTitle(/Dừng ghi âm/i);
    expect(activeMicBtn).toBeInTheDocument();
    expect(activeMicBtn.className).toContain('pulse-mic');

    // Click mic button to stop listening
    fireEvent.click(activeMicBtn);
    expect(mockStopListening).toHaveBeenCalled();
  });
});
