import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Badge, ListGroup } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, MessageSquare, ArrowLeft, Send, Languages, BookOpen, AlertTriangle, 
  Trash2, Plus, CornerDownRight, User, RefreshCw
} from 'lucide-react';
import { aiService } from '../../api/aiService';
import GeminiKeyModal from '../../components/flashcard/GeminiKeyModal/GeminiKeyModal';
import { toast } from 'react-hot-toast';
import './ChatPage.css';

const PERSONAS = [
  { id: 'barista', label: 'Barista (Starbucks)', desc: 'Order coffee and practice food vocabulary.', icon: '☕' },
  { id: 'receptionist', label: 'Receptionist (Grand Hotel)', desc: 'Check-in and ask for hotel amenities.', icon: '🏨' },
  { id: 'interviewer', label: 'Job Interviewer (Google)', desc: 'Simulate a technical or behavioral interview.', icon: '👔' },
  { id: 'friend', label: 'Alex (Close Friend)', desc: 'Chat about weekend plans and daily life.', icon: '👋' },
  { id: 'professor', label: 'Professor Sterling', desc: 'Discuss academic writing and English grammar.', icon: '🎓' }
];

const SUGGESTED_TOPICS = {
  barista: ['Ordering a hot Caramel Macchiato', 'Asking for recommendations', 'Complaining about a wrong drink order'],
  receptionist: ['Checking in a deluxe suite room', 'Booking a city tour guide', 'Requesting extra pillows and late checkout'],
  interviewer: ['Introducing yourself and background', 'Answering: Why do you want this job?', 'Discussing salary expectations'],
  friend: ['Planning a beach trip this Saturday', 'Discussing a movie you just watched', 'Talking about stress at work'],
  professor: ['Asking for feedback on an essay draft', 'Clarifying Subject-Verb Agreement', 'Discussing academic research topic ideas']
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

  const chatEndRef = useRef(null);

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
        setActiveSession(session);
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

    setCreating(true);
    try {
      const res = await aiService.createChatSession({
        persona: selectedPersona,
        topic: topic.trim(),
        level
      });
      const data = res?.data ?? res;
      if (data.success) {
        toast.success('Đã tạo phòng hội thoại!');
        setTopic('');
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
                        placeholder="Ví dụ: Đặt một ly Latte hoặc Thảo luận kế hoạch du lịch..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="custom-form-input mb-2"
                        maxLength={100}
                      />
                      
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
                    </Form.Group>

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
                            <div className="message-bubble shadow-sm">
                              <p className="mb-0 text-bubble">{msg.text}</p>
                              
                              {/* Clicking translation toggle */}
                              {isAi && msg.translation && (
                                <div 
                                  className="translation-toggle mt-1 text-info small cursor-pointer d-flex align-items-center gap-1"
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
                            {isAi && msg.feedback && (
                              <div className="feedback-section mt-1">
                                <Badge 
                                  bg="warning" 
                                  text="dark"
                                  className="grammar-feedback-badge py-1 px-2 d-inline-flex align-items-center gap-1 cursor-pointer"
                                  onClick={() => toggleFeedback(msg._id)}
                                >
                                  <BookOpen size={12} />
                                  <span>Gợi ý ngữ pháp</span>
                                </Badge>
                                
                                <AnimatePresence>
                                  {showFeedback[msg._id] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="feedback-popup p-2 rounded border-warning border mt-1 shadow-sm bg-warning-light"
                                    >
                                      <span className="feedback-text text-dark small">{msg.feedback}</span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
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

                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

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
                            : sending 
                              ? "AI đang phản hồi..." 
                              : "Trả lời bằng tiếng Anh (Ví dụ: Hello, I'd like a latte please)..."
                        }
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value.slice(0, 500))}
                        disabled={sending}
                        className="chat-input-field rounded-pill py-2 px-4 shadow-sm"
                        maxLength={500}
                      />
                      <span className="char-counter text-muted small position-absolute" style={{ right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                        {inputMsg.length}/500
                      </span>
                    </div>

                    <Button 
                      type="submit" 
                      className="btn-send rounded-circle p-2 d-flex align-items-center justify-content-center"
                      disabled={sending || !inputMsg.trim()}
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
    </div>
  );
}
