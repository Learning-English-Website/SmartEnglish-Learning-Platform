import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Badge, ListGroup, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, MessageSquare, ArrowLeft, Send, Languages, BookOpen, AlertTriangle, 
  Trash2, Plus, CornerDownRight, User, RefreshCw, Volume2, Mic, MicOff,
  Award, Check, Book, PlusCircle, CheckCircle
} from 'lucide-react';
import { aiService } from '../../api/aiService';
import { setService } from '../../api/setService';
import GeminiKeyModal from '../../components/flashcard/GeminiKeyModal/GeminiKeyModal';
import { toast } from 'react-hot-toast';
import './ChatPage.css';

const PERSONAS = [
  { id: 'barista', label: 'Barista (Starbucks)', desc: 'Order coffee and practice food vocabulary.', icon: '☕' },
  { id: 'receptionist', label: 'Receptionist (Grand Hotel)', desc: 'Check-in and ask for hotel amenities.', icon: '🏨' },
  { id: 'interviewer', label: 'Job Interviewer (Google)', desc: 'Simulate a technical or behavioral interview.', icon: '👔' },
  { id: 'friend', label: 'Alex (Close Friend)', desc: 'Chat about weekend plans and daily life.', icon: '👋' },
  { id: 'professor', label: 'Professor Sterling', desc: 'Discuss academic writing and English grammar.', icon: '🎓' },
  { id: 'doctor', label: 'Doctor Kelly', desc: 'Describe symptoms and talk about health issues.', icon: '🩺' },
  { id: 'customs_officer', label: 'Border Officer', desc: 'Pass through airport customs and declarations.', icon: '🛃' },
  { id: 'server', label: 'Restaurant Server', desc: 'Order food, ask about specials, and pay the bill.', icon: '🍽️' },
  { id: 'ielts_examiner', label: 'IELTS Examiner', desc: 'Simulate a formal IELTS Speaking interview.', icon: '📝' },
  { id: 'support_agent', label: 'Customer Support', desc: 'Complain about a product or resolve an issue.', icon: '🛠️' },
  { id: 'recruiter', label: 'Job Recruiter', desc: 'Discuss your qualifications and professional fit.', icon: '💼' },
  { id: 'custom', label: 'Tình huống tự chọn', desc: 'Tự định nghĩa kịch bản thực hành của riêng bạn.', icon: '🎯' }
];

const SUGGESTED_TOPICS = {
  barista: ['Ordering a hot Caramel Macchiato', 'Asking for recommendations', 'Complaining about a wrong drink order'],
  receptionist: ['Checking in a deluxe suite room', 'Booking a city tour guide', 'Requesting extra pillows and late checkout'],
  interviewer: ['Introducing yourself and background', 'Answering: Why do you want this job?', 'Discussing salary expectations'],
  friend: ['Planning a beach trip this Saturday', 'Discussing a movie you just watched', 'Talking about stress at work'],
  professor: ['Asking for feedback on an essay draft', 'Clarifying Subject-Verb Agreement', 'Discussing academic research topic ideas'],
  doctor: ['Feeling stomach pain since yesterday', 'Requesting a medical check-up certificate', 'Consulting about high fever and cough'],
  customs_officer: ['Declaring high-value camera equipment', 'Explaining the purpose of a 2-week tourist trip', 'Answering questions about funds and hotel booking'],
  server: ['Ordering a medium-rare ribeye steak', 'Asking about gluten-free food options', 'Asking for the bill and complaining about hair in food'],
  ielts_examiner: ['Part 1: Your hometown and hobbies', 'Part 2: Describe a book that changed your life', 'Part 3: The impact of AI technology on education'],
  support_agent: ['Requesting a refund for a broken phone screen', 'Fixing issues with email notification settings', 'Canceling subscription plan auto-renewal'],
  recruiter: ['Discussing key highlights on your CV', 'Explaining a 6-month employment gap', 'Describing your ideal company culture and teamwork style'],
  custom: ['Tự thiết lập tình huống của riêng bạn...']
};

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Creation state
  const [selectedPersona, setSelectedPersona] = useState('barista');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B1-B2');
  const [creating, setCreating] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  
  // Chat input
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  
  // BYOK Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // Translation visibility set
  const [showTranslation, setShowTranslation] = useState({}); // { messageId: boolean }

  // Grammar feedback popup messageId
  const [showFeedback, setShowFeedback] = useState({}); // { messageId: boolean }

  // Flashcard Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedVocabWords, setSelectedVocabWords] = useState([]);
  const [userFlashcardSets, setUserFlashcardSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const chatEndRef = useRef(null);

  // Speech API States
  const [supportsTTS] = useState('speechSynthesis' in window);
  const [supportsSTT] = useState('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const [isRecording, setIsRecording] = useState(false);
  const [activeAudioMsgId, setActiveAudioMsgId] = useState(null);
  
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (supportsSTT) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMsg(prev => (prev ? prev + ' ' : '') + transcript);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Vui lòng cấp quyền truy cập microphone trong cài đặt trình duyệt.');
        } else {
          toast.error(`Lỗi nhận diện giọng nói: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [supportsSTT]);

  // Clean up speech synthesis when session changes or component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeSession]);

  const handleToggleListening = () => {
    if (!supportsSTT) return;
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Start recognition failed:', err);
      }
    }
  };

  const handlePlayTTS = (msgId, text) => {
    if (!supportsTTS) return;
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (activeAudioMsgId === msgId) {
        setActiveAudioMsgId(null);
        return;
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en-'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onstart = () => {
      setActiveAudioMsgId(msgId);
    };

    utterance.onend = () => {
      setActiveAudioMsgId(null);
    };

    utterance.onerror = () => {
      setActiveAudioMsgId(null);
      toast.error('Không thể phát âm thanh tin nhắn này.');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Fetch key status and session list on mount
  useEffect(() => {
    checkKeyStatus();
    fetchSessions();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const checkKeyStatus = async () => {
    try {
      const res = await aiService.getAiKeyStatus();
      const statusData = res?.data ?? res;
      setHasKey(!!statusData.hasGeminiKey);
    } catch (err) {
      setHasKey(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await aiService.getChatSessions();
      const data = res?.data ?? res;
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách phòng hội thoại.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (session) => {
    setLoadingMessages(true);
    try {
      const res = await aiService.getChatMessages(session._id);
      const data = res?.data ?? res;
      if (data.success) {
        setMessages(data.messages || []);
        
        let loadedSession = { ...session };
        if (session.status === 'completed' && !session.summary) {
          try {
            const sumRes = await aiService.getChatSummary(session._id);
            const sumData = sumRes?.data ?? sumRes;
            if (sumData.success && sumData.summary) {
              loadedSession.summary = sumData.summary;
            }
          } catch (sumErr) {
            console.error('Error loading session summary:', sumErr);
          }
        }
        
        setActiveSession(loadedSession);
        // Clear translations and feedbacks
        setShowTranslation({});
        setShowFeedback({});
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Bạn không có quyền truy cập phòng hội thoại này.');
      } else {
        toast.error('Không thể tải lịch sử tin nhắn.');
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateSession = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      toast.error('Vui lòng chọn hoặc nhập chủ đề hội thoại.');
      return;
    }

    if (selectedPersona === 'custom' && !customScenario.trim()) {
      toast.error('Vui lòng nhập mô tả tình huống tự chọn.');
      return;
    }

    setCreating(true);
    try {
      const res = await aiService.createChatSession({
        persona: selectedPersona,
        topic: topic.trim(),
        level,
        customScenario: selectedPersona === 'custom' ? customScenario.trim() : undefined
      });
      const data = res?.data ?? res;
      if (data.success) {
        toast.success('Đã tạo phòng hội thoại!');
        setTopic('');
        setCustomScenario('');
        // Add to list and open
        setSessions(prev => [data.session, ...prev]);
        setActiveSession(data.session);
        setMessages([data.initialMessage]);
        setShowTranslation({});
        setShowFeedback({});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tạo phòng hội thoại mới.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng hội thoại này và toàn bộ tin nhắn?')) {
      return;
    }

    try {
      const res = await aiService.deleteChatSession(sessionId);
      const data = res?.data ?? res;
      if (data.success) {
        toast.success('Đã xóa phòng hội thoại.');
        setSessions(prev => prev.filter(s => s._id !== sessionId));
        if (activeSession?._id === sessionId) {
          setActiveSession(null);
          setMessages([]);
        }
      }
    } catch (err) {
      toast.error('Không thể xóa phòng hội thoại.');
    }
  };

  const handleEndConversation = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc cuộc hội thoại và xem báo cáo đánh giá?')) {
      return;
    }
    setSending(true);
    try {
      const res = await aiService.endChatSession(activeSession._id);
      const data = res?.data ?? res;
      if (data.success) {
        toast.success('Đã kết thúc cuộc hội thoại!');
        // Update activeSession status to completed and store summary
        setActiveSession(prev => ({ ...prev, status: 'completed', summary: data.summary }));
        // Update session in list
        setSessions(prev => prev.map(s => s._id === activeSession._id ? { ...s, status: 'completed', summary: data.summary } : s));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể kết thúc cuộc hội thoại.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenExportModal = async () => {
    if (selectedVocabWords.length === 0) {
      toast.error('Vui lòng chọn ít nhất một từ vựng để lưu.');
      return;
    }
    
    const defaultSetName = `AI Vocab - ${activeSession?.topic || 'General'}`;
    setNewSetName(defaultSetName);
    setSelectedSetId('');
    setShowExportModal(true);
    
    try {
      const res = await setService.getMySets();
      setUserFlashcardSets(res?.data || res || []);
    } catch (err) {
      console.error('Error loading flashcard sets:', err);
      toast.error('Không thể tải danh sách bộ thẻ hiện có.');
    }
  };

  const handleSaveVocabToFlashcards = async () => {
    if (!selectedSetId && !newSetName.trim()) {
      toast.error('Vui lòng chọn bộ thẻ hiện có hoặc nhập tên bộ thẻ mới.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await aiService.saveVocabToFlashcard(activeSession._id, {
        vocab: selectedVocabWords,
        setId: selectedSetId || undefined,
        newSetName: selectedSetId ? undefined : newSetName.trim()
      });
      const data = res?.data ?? res;
      if (data.success) {
        toast.success(data.message || 'Đã lưu từ vựng vào bộ thẻ flashcard thành công!');
        setShowExportModal(false);
        setSelectedVocabWords([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu từ vựng vào bộ thẻ.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim()) return;
    if (sending) return;

    if (!hasKey) {
      setShowKeyModal(true);
      return;
    }

    const textToSend = inputMsg.trim();
    setInputMsg('');
    setSending(true);

    // Optimistically create temporary local user message to display instantly
    const tempUserMsg = {
      _id: 'temp-' + Date.now(),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await aiService.sendChatMessage(activeSession._id, { text: textToSend });
      const data = res?.data ?? res;
      if (data.success) {
        // Replace temp message with server saved message, append AI reply
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== tempUserMsg._id);
          return [...filtered, data.userMessage, data.aiMessage];
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.message || 'Gặp lỗi khi gửi tin nhắn.';
      
      // AI fail after saving user message
      if (err.response?.data?.userMessage) {
        // Replace temp message with server saved message that includes its real ID, which enables Retry
        const savedUserMsg = err.response.data.userMessage;
        // Keep it in message list but mark it as failed/retryable
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== tempUserMsg._id);
          return [...filtered, { ...savedUserMsg, failed: true }];
        });
        toast.error(errMsg);
      } else {
        // Entire request failed, remove temp message
        setMessages(prev => prev.filter(m => m._id !== tempUserMsg._id));
        if (status === 428) {
          setShowKeyModal(true);
          toast.error('Vui lòng thiết lập API Key.');
        } else if (status === 429) {
          toast.error('Tần suất gửi tin nhắn quá nhanh. Giới hạn 10 tin/phút.');
        } else {
          toast.error(errMsg);
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleRetryMessage = async (failedMsg) => {
    if (sending) return;
    if (!hasKey) {
      setShowKeyModal(true);
      return;
    }

    setSending(true);
    // Mark this message as no longer showing failed state (show typing spinner)
    setMessages(prev => prev.map(m => m._id === failedMsg._id ? { ...m, failed: false } : m));

    try {
      const res = await aiService.sendChatMessage(activeSession._id, { retryMessageId: failedMsg._id });
      const data = res?.data ?? res;
      if (data.success) {
        // Replace user message with verified state, append AI reply
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== failedMsg._id);
          return [...filtered, data.userMessage, data.aiMessage];
        });
        toast.success('Đã gửi lại thành công!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Gửi lại thất bại.';
      // Mark it back as failed
      setMessages(prev => prev.map(m => m._id === failedMsg._id ? { ...m, failed: true } : m));
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  const toggleTranslation = (msgId) => {
    setShowTranslation(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleFeedback = (msgId) => {
    setShowFeedback(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activePersonaDetail = PERSONAS.find(p => p.id === activeSession?.persona);
  const userMessageCount = messages.filter(m => m.sender === 'user').length;
  const isLimitReached = userMessageCount >= 30;
  const isWarningReached = userMessageCount >= 25;
  const isCompleted = activeSession?.status === 'completed';

  return (
    <div className="chatpage-container">
      {/* Background Glows */}
      <div className="chat-glow glow-primary"></div>
      <div className="chat-glow glow-secondary"></div>

      <Container className="py-4 chatpage-inner">
        {!activeSession ? (
          /* ================== SETUP SCREEN ================== */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-5 mt-3">
              <div className="d-inline-flex align-items-center gap-2 promo-pill mb-3">
                <Sparkles size={16} className="text-info" />
                <span>AI Partner Luyện Giao Tiếp</span>
              </div>
              <h1 className="setup-title">Luyện Hội Thoại Tiếng Anh</h1>
              <p className="setup-subtitle">Nhập vai trong các tình huống thực tế và nhận phản hồi lỗi ngữ pháp tức thì từ AI</p>
              
              {!hasKey && (
                <Alert variant="warning" className="d-inline-flex align-items-center gap-2 mt-2 px-4 py-2 border-warning shadow-sm" style={{ borderRadius: '14px' }}>
                  <AlertTriangle size={16} />
                  <span>Chưa kết nối Gemini API Key. <span className="text-primary fw-bold cursor-pointer" onClick={() => setShowKeyModal(true)} style={{ textDecoration: 'underline' }}>Cấu hình ngay</span> để sử dụng.</span>
                </Alert>
              )}
            </div>

            <Row className="g-4">
              {/* Creation Form */}
              <Col lg={8}>
                <Card className="setup-card p-4 shadow-sm border-0">
                  <h3 className="card-section-title mb-4">
                    <Plus size={20} className="me-2 text-primary" /> Thiết lập hội thoại mới
                  </h3>

                  <Form onSubmit={handleCreateSession}>
                    {/* Choose Persona */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">1. Chọn nhân vật và ngữ cảnh nhập vai</Form.Label>
                      <Row className="g-3 mt-1">
                        {PERSONAS.map(p => (
                          <Col md={6} key={p.id}>
                            <div 
                              className={`persona-card ${selectedPersona === p.id ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedPersona(p.id);
                                // Default first topic suggestion
                                setTopic(SUGGESTED_TOPICS[p.id][0]);
                              }}
                            >
                              <span className="persona-icon">{p.icon}</span>
                              <div className="persona-details">
                                <span className="persona-label">{p.label}</span>
                                <span className="persona-desc">{p.desc}</span>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Form.Group>

                    {/* Choose Topic */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">2. Chủ đề thảo luận (Topic)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder={selectedPersona === 'custom' ? "Đặt tiêu đề cho kịch bản của bạn (ví dụ: Phỏng vấn xin visa)" : "Ví dụ: Đặt một ly Latte hoặc Thảo luận kế hoạch du lịch..."}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="custom-form-input mb-2"
                        maxLength={100}
                      />
                      
                      {selectedPersona !== 'custom' && (
                        <div className="suggestions-box mt-2">
                          <span className="small text-muted d-block mb-1">Gợi ý chủ đề:</span>
                          <div className="d-flex flex-wrap gap-2">
                            {SUGGESTED_TOPICS[selectedPersona]?.map((suggested, idx) => (
                              <Badge 
                                key={idx} 
                                bg="secondary" 
                                className="suggestion-badge"
                                onClick={() => setTopic(suggested)}
                              >
                                {suggested}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Form.Group>

                    {/* Custom Scenario Description (Only for custom persona) */}
                    {selectedPersona === 'custom' && (
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">Mô tả kịch bản hội thoại tự chọn</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          placeholder="Mô tả chi tiết tình huống bạn muốn thực hành bằng tiếng Việt hoặc tiếng Anh (ví dụ: Tôi là một khách du lịch đang phàn nàn với tài xế Uber về việc đi sai đường, AI đóng vai tài xế Uber lịch sự)..."
                          value={customScenario}
                          onChange={(e) => setCustomScenario(e.target.value.slice(0, 500))}
                          className="custom-form-input"
                          maxLength={500}
                        />
                        <span className="small text-muted float-end mt-1">{customScenario.length}/500</span>
                      </Form.Group>
                    )}

                    {/* Choose Level */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">3. Trình độ tiếng Anh phù hợp</Form.Label>
                      <div className="d-flex gap-3 mt-1">
                        {['A1-A2', 'B1-B2', 'C1-C2'].map(lvl => (
                          <div 
                            key={lvl}
                            className={`level-option ${level === lvl ? 'active' : ''}`}
                            onClick={() => setLevel(lvl)}
                          >
                            <span className="level-name">{lvl}</span>
                            <span className="level-desc">
                              {lvl === 'A1-A2' ? 'Cơ bản (Sử dụng từ đơn giản)' : 
                               lvl === 'B1-B2' ? 'Trung cấp (Độ khó vừa phải)' : 'Nâng cao (Phản xạ học thuật)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Form.Group>

                    {/* Submit Button */}
                    <div className="d-flex justify-content-end mt-4">
                      <Button 
                        type="submit" 
                        className="btn-create-session py-2 px-4 d-flex align-items-center gap-2"
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <Spinner animation="border" size="sm" />
                            <span>Đang chuẩn bị phòng...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>Tạo cuộc hội thoại</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </Card>
              </Col>

              {/* History list */}
              <Col lg={4}>
                <Card className="setup-card p-4 shadow-sm border-0 h-100 d-flex flex-column">
                  <h3 className="card-section-title mb-3">
                    <MessageSquare size={18} className="me-2 text-primary" /> Phòng đã tham gia
                  </h3>

                  {loadingSessions ? (
                    <div className="text-center py-5 my-auto">
                      <Spinner animation="border" variant="primary" />
                      <p className="text-muted mt-2 small">Đang tải lịch sử...</p>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-5 my-auto text-muted">
                      <MessageSquare size={32} className="opacity-30 mb-2" />
                      <p className="small mb-0">Bạn chưa có phòng chat nào.</p>
                      <p className="small opacity-50">Hãy thiết lập hội thoại đầu tiên!</p>
                    </div>
                  ) : (
                    <div className="sessions-list overflow-auto flex-grow-1 pr-1">
                      <ListGroup variant="flush">
                        {sessions.map(s => {
                          const pers = PERSONAS.find(p => p.id === s.persona);
                          return (
                            <ListGroup.Item 
                              key={s._id} 
                              className="session-item-row d-flex align-items-center justify-content-between border-0 rounded-3 mb-2 p-3"
                              onClick={() => loadMessages(s)}
                            >
                              <div className="d-flex align-items-center gap-3 flex-grow-1 overflow-hidden">
                                <span className="session-item-icon">{pers?.icon || '💬'}</span>
                                <div className="overflow-hidden">
                                  <div className="session-item-header d-flex align-items-center gap-2">
                                    <span className="session-item-name text-truncate fw-bold">{pers?.label || s.persona}</span>
                                    <Badge bg="info" className="level-badge">{s.level}</Badge>
                                  </div>
                                  <div className="session-item-topic text-truncate text-muted small">{s.topic}</div>
                                </div>
                              </div>
                              <Button 
                                variant="link" 
                                className="delete-session-btn p-1 text-danger"
                                onClick={(e) => handleDeleteSession(s._id, e)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </motion.div>
        ) : (
          /* ================== CONVERSATION SCREEN ================== */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="chat-workspace"
          >
            <Card className="chat-card shadow-lg border-0 d-flex flex-column">
              {/* Header */}
              <div className="chat-header p-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <Button 
                    variant="outline-glass" 
                    className="p-2 border-0 rounded-circle text-muted"
                    onClick={() => {
                      setActiveSession(null);
                      setMessages([]);
                      fetchSessions();
                    }}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  
                  <div className="d-flex align-items-center gap-2">
                    <span className="chat-avatar">{activePersonaDetail?.icon || '💬'}</span>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h4 className="chat-title mb-0">{activePersonaDetail?.label}</h4>
                        <Badge bg="info" className="level-badge">{activeSession.level}</Badge>
                      </div>
                      <div className="chat-subtitle text-muted small text-truncate">Chủ đề: {activeSession.topic}</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {activeSession && !isCompleted && (
                    <Button 
                      variant="danger" 
                      size="sm"
                      className="btn-end-chat px-3 py-1.5 rounded-pill d-flex align-items-center gap-1 shadow-sm fw-bold"
                      onClick={handleEndConversation}
                      disabled={sending}
                    >
                      <span>Kết thúc</span>
                    </Button>
                  )}
                  <Button
                    variant="outline-secondary"
                    className="btn-header-key p-2 rounded-circle"
                    onClick={() => setShowKeyModal(true)}
                  >
                    <Sparkles size={16} className={hasKey ? "text-success" : "text-warning"} />
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    className="p-2 rounded-circle border-0 text-danger"
                    onClick={(e) => handleDeleteSession(activeSession._id, e)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {/* Chat Messages Box */}
              <div className="chat-messages-container p-4 overflow-auto flex-grow-1">
                {loadingMessages ? (
                  <div className="text-center py-5 my-auto">
                    <Spinner animation="border" variant="primary" />
                    <p className="text-muted mt-2 small">Đang tải lịch sử tin nhắn...</p>
                  </div>
                ) : (
                  <div className="messages-stack d-flex flex-column gap-3">
                    {messages.map((msg) => {
                      const isAi = msg.sender === 'ai';
                      
                      return (
                        <div 
                          key={msg._id} 
                          className={`message-wrapper ${isAi ? 'message-ai' : 'message-user'}`}
                        >
                          {!isAi && msg.failed && (
                            <div className="retry-indicator me-2">
                              <Button 
                                size="sm" 
                                variant="outline-danger" 
                                className="px-2 py-1 d-flex align-items-center gap-1"
                                onClick={() => handleRetryMessage(msg)}
                                disabled={sending}
                              >
                                <RefreshCw size={12} className={sending ? "spin" : ""} />
                                <span style={{ fontSize: '0.75rem' }}>Gửi lại</span>
                              </Button>
                            </div>
                          )}

                          <div className="message-content-box">
                            <div className="message-bubble shadow-sm d-flex flex-column">
                              <div className="d-flex align-items-start justify-content-between gap-2">
                                <p className="mb-0 text-bubble flex-grow-1">{msg.text}</p>
                                {isAi && supportsTTS && (
                                  <Button
                                    variant="link"
                                    className={`p-0 border-0 text-muted hover-text-primary flex-shrink-0 ${activeAudioMsgId === msg._id ? 'animate-pulse' : ''}`}
                                    onClick={() => handlePlayTTS(msg._id, msg.text)}
                                    style={{ marginTop: '2px' }}
                                  >
                                    <Volume2 size={16} className={activeAudioMsgId === msg._id ? "text-primary" : ""} />
                                  </Button>
                                )}
                              </div>
                              
                              {/* Clicking translation toggle */}
                              {isAi && msg.translation && (
                                <div 
                                  className="translation-toggle mt-1 text-info small cursor-pointer d-flex align-items-center gap-1 align-self-start"
                                  onClick={() => toggleTranslation(msg._id)}
                                >
                                  <Languages size={12} />
                                  <span>{showTranslation[msg._id] ? 'Ẩn dịch nghĩa' : 'Xem dịch nghĩa'}</span>
                                </div>
                              )}
                            </div>

                            {/* Show translation text with slide-down animation */}
                            <AnimatePresence>
                              {isAi && msg.translation && showTranslation[msg._id] && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="translation-panel p-2 rounded mt-1 shadow-sm"
                                >
                                  <CornerDownRight size={12} className="text-muted float-start me-1 mt-1" />
                                  <span className="translation-text small">{msg.translation}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Show grammar feedback helper badge/popup */}
                            {isAi && msg.feedback && (() => {
                              const isObject = typeof msg.feedback === 'object' && msg.feedback !== null;
                              const hasMistake = isObject ? !!msg.feedback.hasMistake : true;
                              if (!hasMistake) return null;

                              return (
                                <div className="feedback-section mt-1">
                                  <Badge 
                                    bg="warning" 
                                    text="dark"
                                    className="grammar-feedback-badge py-1 px-2 d-inline-flex align-items-center gap-1 cursor-pointer"
                                    onClick={() => toggleFeedback(msg._id)}
                                  >
                                    <BookOpen size={12} />
                                    <span>Gợi ý ngữ pháp {isObject && msg.feedback.errorType ? `(${msg.feedback.errorType})` : ''}</span>
                                  </Badge>
                                  
                                  <AnimatePresence>
                                    {showFeedback[msg._id] && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="feedback-popup p-3 rounded border-warning border mt-1 shadow-sm bg-warning-light"
                                      >
                                        {!isObject ? (
                                          <span className="feedback-text text-dark small">{msg.feedback}</span>
                                        ) : (
                                          <div className="feedback-object-details small text-dark d-flex flex-column gap-2">
                                            {msg.feedback.original && (
                                              <div>
                                                <span className="text-danger fw-bold">Bạn đã viết:</span>{' '}
                                                <span className="text-decoration-line-through text-muted">{msg.feedback.original}</span>
                                              </div>
                                            )}
                                            {msg.feedback.corrected && (
                                              <div>
                                                <span className="text-success fw-bold">Nên sửa thành:</span>{' '}
                                                <span className="fw-semibold text-success bg-success-subtle px-1 rounded">{msg.feedback.corrected}</span>
                                              </div>
                                            )}
                                            {msg.feedback.explanation && (
                                              <div className="pt-2 border-top border-warning-subtle text-muted">
                                                <span className="fw-bold">Giải thích:</span>{' '}
                                                <span>{msg.feedback.explanation}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}

                    {/* AI typing loading spinner */}
                    {sending && (
                      <div className="message-wrapper message-ai">
                        <div className="message-bubble typing-bubble d-flex align-items-center justify-content-center p-3">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </div>
                      </div>
                    )}

                    {/* Report Card (Session Summary) */}
                    {isCompleted && activeSession?.summary && (
                      <div className="session-report-card mt-4 p-4 rounded-4 shadow-sm border bg-white text-dark">
                        <div className="text-center mb-4">
                          <Badge bg="success" className="px-3 py-2 rounded-pill mb-2 fs-6">
                            🎯 Báo cáo tổng kết hội thoại
                          </Badge>
                          <h3 className="fw-bold mt-2 text-primary">AI Conversation Report</h3>
                          <p className="text-muted">Cố vấn học tập AI đã phân tích buổi nói chuyện của bạn</p>
                        </div>

                        {/* Scores Grid */}
                        <Row className="g-3 mb-4 text-center">
                          <Col xs={4}>
                            <Card className="border-0 bg-light p-3 rounded-4 shadow-sm">
                              <Award className="text-primary mx-auto mb-2" size={24} />
                              <div className="small text-muted fw-semibold">Ngữ pháp</div>
                              <h3 className="fw-bold text-primary mt-1 mb-0">{activeSession.summary.grammarScore || 100}%</h3>
                            </Card>
                          </Col>
                          <Col xs={4}>
                            <Card className="border-0 bg-light p-3 rounded-4 shadow-sm">
                              <Book className="text-success mx-auto mb-2" size={24} />
                              <div className="small text-muted fw-semibold">Từ vựng</div>
                              <h3 className="fw-bold text-success mt-1 mb-0">{activeSession.summary.vocabularyScore || 100}%</h3>
                            </Card>
                          </Col>
                          <Col xs={4}>
                            <Card className="border-0 bg-light p-3 rounded-4 shadow-sm">
                              <MessageSquare className="text-warning mx-auto mb-2" size={24} />
                              <div className="small text-muted fw-semibold">Trôi chảy</div>
                              <h3 className="fw-bold text-warning mt-1 mb-0">{activeSession.summary.pronunciationScore || 100}%</h3>
                            </Card>
                          </Col>
                        </Row>

                        {/* Overall Feedback */}
                        <div className="feedback-section mb-4 p-3 rounded-3 bg-light border-start border-primary border-4 text-start">
                          <h5 className="fw-bold text-dark d-flex align-items-center gap-2">
                            <Sparkles size={18} className="text-primary" /> Nhận xét tổng quát:
                          </h5>
                          <p className="mb-0 text-secondary leading-relaxed small">{activeSession.summary.overallFeedback}</p>
                        </div>

                        {/* Common Mistakes */}
                        {activeSession.summary.commonMistakes && activeSession.summary.commonMistakes.length > 0 && (
                          <div className="mistakes-section mb-4 text-start">
                            <h5 className="fw-bold text-danger mb-3 d-flex align-items-center gap-2">
                              <AlertTriangle size={18} /> Các lỗi ngữ pháp cần lưu ý:
                            </h5>
                            <div className="d-flex flex-column gap-3">
                              {activeSession.summary.commonMistakes.map((mistake, idx) => (
                                <Card key={idx} className="border-0 bg-light-danger p-3 rounded-3">
                                  <div className="text-danger small mb-1">
                                    <strong>❌ Lỗi sai:</strong> <s>{mistake.original}</s>
                                  </div>
                                  <div className="text-success small mb-2">
                                    <strong> Nên sửa thành:</strong> {mistake.corrected}
                                  </div>
                                  <div className="text-secondary small leading-relaxed border-top pt-2 mt-1">
                                    💡 <strong>Giải thích:</strong> {mistake.explanation}
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended Expressions */}
                        {activeSession.summary.recommendedExpressions && activeSession.summary.recommendedExpressions.length > 0 && (
                          <div className="expressions-section mb-4 text-start">
                            <h5 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                              <Languages size={18} /> Mẫu câu khuyên dùng (Recommended):
                            </h5>
                            <ListGroup variant="flush" className="rounded-3 overflow-hidden border">
                              {activeSession.summary.recommendedExpressions.map((expr, idx) => (
                                <ListGroup.Item key={idx} className="small d-flex align-items-center gap-2 py-2 px-3">
                                  <Check size={16} className="text-success flex-shrink-0" />
                                  <span>{expr}</span>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </div>
                        )}

                        {/* Vocabulary Highlight with save vocabulary features */}
                        {activeSession.summary.vocabularyHighlight && activeSession.summary.vocabularyHighlight.length > 0 && (
                          <div className="vocab-highlight-section mb-2 text-start">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <h5 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
                                <BookOpen size={18} /> Từ vựng nổi bật (Vocabulary Highlight):
                              </h5>
                              {selectedVocabWords.length > 0 && (
                                <Button 
                                  variant="success" 
                                  size="sm" 
                                  className="rounded-pill px-3 py-1 fw-bold shadow-sm d-flex align-items-center gap-1"
                                  onClick={handleOpenExportModal}
                                >
                                  <PlusCircle size={14} />
                                  <span>Lưu bộ thẻ ({selectedVocabWords.length})</span>
                                </Button>
                              )}
                            </div>
                            
                            <p className="small text-muted mb-3">Tích chọn từ vựng bạn muốn lưu vào flashcards để luyện tập thêm.</p>

                            <div className="d-flex flex-column gap-2">
                              {activeSession.summary.vocabularyHighlight.map((vocab, idx) => {
                                const isSelected = selectedVocabWords.some(w => w.word === vocab.word);
                                return (
                                  <div 
                                    key={idx}
                                    className={`vocab-item-row p-3 border rounded-3 d-flex align-items-start gap-3 transition-all ${isSelected ? 'border-success bg-light' : ''}`}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedVocabWords(prev => prev.filter(w => w.word !== vocab.word));
                                      } else {
                                        setSelectedVocabWords(prev => [...prev, vocab]);
                                      }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className="pt-1">
                                      <Form.Check
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}} // handled by row onClick
                                        className="m-0 custom-success-checkbox"
                                      />
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <strong className="text-dark fs-6">{vocab.word}</strong>
                                        {vocab.ipa && <span className="text-muted small font-monospace">{vocab.ipa}</span>}
                                      </div>
                                      <div className="text-success small fw-semibold mt-1">{vocab.definition}</div>
                                      {vocab.example && (
                                        <div className="text-muted small mt-2 border-start ps-2 fst-italic">
                                          "{vocab.example}"
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Limit Alerts */}
              {(isCompleted || isLimitReached || isWarningReached) && (
                <div className="px-4 py-2 border-top bg-light-trans">
                  {isCompleted ? (
                    <Alert variant="info" className="mb-0 py-2 border-0 rounded-3 text-center small shadow-sm">
                      ✨ Buổi hội thoại này đã kết thúc. Bạn có thể xem lại lịch sử và báo cáo tổng kết bên dưới.
                    </Alert>
                  ) : isLimitReached ? (
                    <Alert variant="danger" className="mb-0 py-2 border-0 rounded-3 text-center small shadow-sm fw-bold d-flex align-items-center justify-content-center gap-2">
                      <span>🚫 Bạn đã đạt giới hạn tối đa 30 lượt tin nhắn.</span>
                      <Button variant="danger" size="sm" className="py-0 px-2 rounded" onClick={handleEndConversation} disabled={sending}>
                        Kết thúc & Xem báo cáo
                      </Button>
                    </Alert>
                  ) : (
                    <Alert variant="warning" className="mb-0 py-2 border-0 rounded-3 text-center small shadow-sm">
                      ⚠️ Bạn đã gửi {userMessageCount}/30 lượt tin nhắn. Sắp đạt giới hạn, bạn nên kết thúc để xem báo cáo tổng kết.
                    </Alert>
                  )}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="chat-footer p-3 border-top bg-light-trans">
                <Form onSubmit={handleSendMessage}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="flex-grow-1 position-relative">
                      <Form.Control
                        type="text"
                        placeholder={
                          !hasKey 
                            ? "Hãy kết nối Gemini API Key ở góc trên để chat..." 
                            : isCompleted
                              ? "Buổi hội thoại đã kết thúc. Chỉ xem lịch sử."
                              : isLimitReached
                                ? "Đã đạt giới hạn 30 lượt tin nhắn."
                                : sending 
                                  ? "AI đang phản hồi..." 
                                  : isRecording
                                    ? "Đang lắng nghe giọng nói của bạn..."
                                    : "Trả lời bằng tiếng Anh (Ví dụ: Hello, I'd like a latte please)..."
                        }
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value.slice(0, 500))}
                        disabled={sending || isLimitReached || isCompleted || !hasKey}
                        className="chat-input-field rounded-pill py-2 px-4 shadow-sm"
                        maxLength={500}
                      />
                      <span className="char-counter text-muted small position-absolute" style={{ right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                        {inputMsg.length}/500
                      </span>
                    </div>

                    {/* Microphone button (STT) */}
                    {supportsSTT ? (
                      <Button
                        type="button"
                        variant={isRecording ? "danger" : "outline-secondary"}
                        className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${isRecording ? 'animate-pulse' : ''}`}
                        onClick={handleToggleListening}
                        disabled={sending || isLimitReached || isCompleted || !hasKey}
                        title={isRecording ? "Đang lắng nghe... Bấm để dừng" : "Luyện nói qua Micro"}
                        style={{ width: '38px', height: '38px' }}
                      >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="rounded-circle p-2 d-flex align-items-center justify-content-center opacity-50"
                        disabled={true}
                        title="Trình duyệt chưa hỗ trợ ghi âm trực tiếp. Khuyên dùng Chrome/Edge."
                        style={{ width: '38px', height: '38px' }}
                      >
                        <MicOff size={18} />
                      </Button>
                    )}

                    <Button 
                      type="submit" 
                      className="btn-send rounded-circle p-2 d-flex align-items-center justify-content-center"
                      disabled={sending || !inputMsg.trim() || isLimitReached || isCompleted}
                      style={{ width: '38px', height: '38px' }}
                    >
                      <Send size={18} fill="currentColor" />
                    </Button>
                  </div>
                </Form>
              </div>
            </Card>
          </motion.div>
        )}
      </Container>

      {/* Global BYOK Key Settings Modal */}
      <GeminiKeyModal 
        show={showKeyModal} 
        onHide={() => setShowKeyModal(false)} 
        onKeyStatusChange={(status) => setHasKey(status)}
      />

      {/* Save Vocabulary to Flashcard Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered className="text-dark">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <BookOpen className="text-success" size={24} />
            <span>Lưu từ vựng vào Flashcards</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <p className="small text-muted mb-4 text-start">
            Lưu {selectedVocabWords.length} từ đã chọn vào bộ thẻ từ vựng của bạn để dễ dàng ôn tập và học theo phương pháp lặp lại ngắt quãng (spaced repetition).
          </p>

          <Form className="text-start">
            {/* Choose target Set type */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-secondary">PHƯƠNG THỨC LƯU</Form.Label>
              <div className="d-flex gap-3 mt-1">
                <Form.Check
                  type="radio"
                  label="Tạo bộ thẻ mới"
                  name="exportTarget"
                  id="target-new"
                  checked={!selectedSetId}
                  onChange={() => setSelectedSetId('')}
                  className="fw-semibold text-dark"
                />
                <Form.Check
                  type="radio"
                  label="Lưu vào bộ thẻ hiện có"
                  name="exportTarget"
                  id="target-existing"
                  checked={!!selectedSetId}
                  onChange={() => {
                    if (userFlashcardSets.length > 0) {
                      setSelectedSetId(userFlashcardSets[0]._id);
                    } else {
                      toast.error('Bạn chưa có bộ thẻ từ vựng nào. Hãy tạo bộ thẻ mới!');
                      setSelectedSetId('');
                    }
                  }}
                  className="fw-semibold text-dark"
                  disabled={userFlashcardSets.length === 0}
                />
              </div>
            </Form.Group>

            {/* If existing set */}
            {selectedSetId ? (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">Chọn bộ thẻ từ vựng</Form.Label>
                <Form.Select 
                  value={selectedSetId} 
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  className="custom-form-input"
                >
                  {userFlashcardSets.map(set => (
                    <option key={set._id} value={set._id}>
                      {set.title} ({set.cardCount} thẻ)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            ) : (
              /* If new set */
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">Tên bộ thẻ mới</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ví dụ: AI Vocab - Ordering Coffee"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value.slice(0, 100))}
                  className="custom-form-input"
                  maxLength={100}
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setShowExportModal(false)} disabled={isExporting} className="rounded-pill px-4">
            Hủy
          </Button>
          <Button 
            variant="success" 
            onClick={handleSaveVocabToFlashcards} 
            disabled={isExporting || (!selectedSetId && !newSetName.trim())}
            className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-1"
          >
            {isExporting ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Xác nhận lưu</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
