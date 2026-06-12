import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import axiosClient from '../../api/axiosClient';
import { MessageSquare, Send, Check, ShieldAlert, Award, UserCheck, XCircle, User, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminPage.css';

export default function AdminSupportChatPage() {
  const { user: currentUser } = useAuth();
  const { socket, socketRef } = useSocket();

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingStudents, setTypingStudents] = useState({});

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const messageEndRef = useRef(null);

  // Clear typing state on session change
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
  }, [selectedSession]);

  // Track active session for global notification dedup (see SocketContext)
  useEffect(() => {
    window.__activeSupportStudentId = selectedSession?.student?._id || null;
    return () => {
      window.__activeSupportStudentId = null;
    };
  }, [selectedSession]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load support sessions
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await axiosClient.get('/support-chat/admin/sessions');
      setSessions(res.data || []);
    } catch {
      toast.error('Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load messages for a selected session
  const selectSession = async (session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const res = await axiosClient.get(`/support-chat/admin/sessions/${session.student._id}/messages`);
      setMessages(res.data.messages || []);
      // Refresh session data (resets unreadCount)
      setSessions(prev =>
        prev.map(s => s._id === session._id ? { ...s, unreadCount: 0 } : s)
      );
    } catch {
      toast.error('Không thể tải lịch sử tin nhắn');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Socket listener
  useEffect(() => {
    if (!socket) return;

    // Listen for new support messages
    const handleNewMessage = (payload) => {
      if (!payload || !payload.session || !payload.message) return;
      const { message, session: updatedSession } = payload;
      if (!message || !message._id || !message.sender) return;
      
      // 1. Update session list in left panel
      setSessions(prev => {
        const index = prev.findIndex(s => s._id === updatedSession._id);
        
        let newSessions = [...prev];
        if (index !== -1) {
          // If the selected session is currently open, set unread count to 0 in UI
          const unreadCount = (selectedSession && selectedSession._id === updatedSession._id) ? 0 : updatedSession.unreadCount;
          newSessions[index] = { ...updatedSession, unreadCount };
        } else if (updatedSession.status === 'open') {
          // Add new active session
          newSessions = [updatedSession, ...newSessions];
        }

        // Sort by last message time
        return newSessions.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });

      const isMe = message.sender === currentUser?._id || message.sender?._id === currentUser?._id;

      // 2. If this message belongs to the currently selected session, append it
      if (selectedSession && message.session === selectedSession._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      } else if (!isMe) {
        // Show toast notification if we are not looking at this chat session
        toast(`Tin nhắn mới từ ${updatedSession.student?.username || 'học viên'}: ${message.text}`, {
          icon: '💬',
          id: message._id
        });
      }
    };

    // Listen for support session status/assign updates
    const handleSessionUpdated = (updatedSession) => {
      setSessions(prev => {
        // If closed, remove from active list
        if (updatedSession.status === 'closed') {
          if (selectedSession && selectedSession._id === updatedSession._id) {
            setSelectedSession(null);
            setMessages([]);
          }
          return prev.filter(s => s._id !== updatedSession._id);
        }

        const index = prev.findIndex(s => s._id === updatedSession._id);
        let newSessions = [...prev];
        if (index !== -1) {
          newSessions[index] = { ...newSessions[index], ...updatedSession };
        } else {
          newSessions = [updatedSession, ...newSessions];
        }

        return newSessions;
      });

      if (selectedSession && selectedSession._id === updatedSession._id) {
        setSelectedSession(prev => ({ ...prev, ...updatedSession }));
      }
    };

    const handleTypingStatus = (payload) => {
      const { studentId, isTyping } = payload;
      if (studentId) {
        setTypingStudents(prev => ({
          ...prev,
          [studentId]: isTyping
        }));
      }
    };

    socket.on('support:message:receive', handleNewMessage);
    socket.on('support:session:updated', handleSessionUpdated);
    socket.on('support:typing:receive', handleTypingStatus);

    return () => {
      socket.off('support:message:receive', handleNewMessage);
      socket.off('support:session:updated', handleSessionUpdated);
      socket.off('support:typing:receive', handleTypingStatus);
    };
  }, [selectedSession, socket, currentUser]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedSession || !chatInput.trim()) return;

    const textToSend = chatInput.trim();
    setChatInput('');

    // Stop typing status immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current && socketRef.current) {
      isTypingRef.current = false;
      socketRef.current.emit('support:typing:send', { studentId: selectedSession.student._id, isTyping: false });
    }

    try {
      const res = await axiosClient.post(`/support-chat/admin/sessions/${selectedSession.student._id}/messages`, {
        text: textToSend
      });
      setMessages(prev => {
        if (prev.some(m => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
    } catch {
      toast.error('Không thể gửi tin nhắn. Thử lại sau.');
    }
  };

  const handleChatInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);

    if (!socketRef.current || !selectedSession) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current.emit('support:typing:send', { studentId: selectedSession.student._id, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketRef.current.emit('support:typing:send', { studentId: selectedSession.student._id, isTyping: false });
    }, 2500);
  };

  // Assign session
  const handleAssignSession = async () => {
    if (!selectedSession) return;
    try {
      const res = await axiosClient.put(`/support-chat/admin/sessions/${selectedSession.student._id}/assign`);
      setSelectedSession(res.data);
      toast.success('Đã nhận hỗ trợ cuộc trò chuyện này');
    } catch {
      toast.error('Gán hỗ trợ thất bại');
    }
  };

  // Close session
  const handleCloseSession = async () => {
    if (!selectedSession) return;
    try {
      await axiosClient.put(`/support-chat/admin/sessions/${selectedSession.student._id}/close`);
      toast.success('Đã đóng phiên trò chuyện hỗ trợ');
      setSelectedSession(null);
      setMessages([]);
      loadSessions();
    } catch {
      toast.error('Đóng cuộc trò chuyện thất bại');
    }
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const normalizedBase = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
    return `${normalizedBase}${url}`;
  };

  const handleChatImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSession) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const loadingToastId = toast.loading('Đang gửi ảnh...');
    try {
      const res = await axiosClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const messageRes = await axiosClient.post(`/support-chat/admin/sessions/${selectedSession.student._id}/messages`, {
        image: res.url
      });
      
      setMessages(prev => {
        if (prev.some(m => m._id === messageRes.data._id)) return prev;
        return [...prev, messageRes.data];
      });
      toast.success('Gửi ảnh thành công', { id: loadingToastId });
    } catch {
      toast.error('Gửi ảnh thất bại', { id: loadingToastId });
    }
  };

  return (
    <div className="admin-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="admin-page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Hỗ trợ trực tuyến thời gian thực (realtime) qua kết nối WebSockets.
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '20px', overflow: 'hidden' }}>
        
        {/* Left panel: Active Chat Queues */}
        <div style={{
          width: '320px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-heading)' }}>
            Hàng đợi hỗ trợ ({sessions.length})
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {loadingSessions ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '10px', display: 'block', margin: '0 auto' }} />
                <p style={{ fontSize: '0.85rem' }}>Không có cuộc trò chuyện nào cần hỗ trợ.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map(s => {
                  const isSelected = selectedSession && selectedSession._id === s._id;
                  const isAssignedToMe = s.cskh && s.cskh._id === currentUser._id;
                  return (
                    <div
                      key={s._id}
                      onClick={() => selectSession(s)}
                      style={{
                        padding: '12px', borderRadius: '12px', cursor: 'pointer',
                        background: isSelected ? 'var(--bg-hover)' : 'var(--bg-card)',
                        border: `2px solid ${isSelected ? 'var(--color-primary, #6366f1)' : 'var(--border-subtle)'}`,
                        transition: 'all 0.2s', position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {s.student?.avatar ? (
                            <img src={s.student.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={16} style={{ color: '#6366f1' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.student?.username}
                            </span>
                            {s.student?.premium === 'premium' && (
                              <Award size={14} style={{ color: '#f59e0b', flexShrink: 0 }} title="Premium Student" />
                            )}
                          </div>
                          <p style={{
                            margin: 0, fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontStyle: typingStudents[s.student?._id] ? 'italic' : 'normal',
                            fontWeight: typingStudents[s.student?._id] ? 700 : 'normal'
                          }}>
                            {typingStudents[s.student?._id] ? 'Đang soạn tin nhắn...' : (s.lastMessage || 'Bắt đầu chat...')}
                          </p>
                        </div>
                      </div>

                      {/* Badges / Unread indicators */}
                      {s.unreadCount > 0 && (
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: 'white',
                          borderRadius: '50%', minWidth: '18px', height: '18px', padding: '0 5px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold'
                        }}>
                          {s.unreadCount}
                        </div>
                      )}

                      {s.cskh && (
                        <div style={{
                          marginTop: '6px', fontSize: '0.7rem', color: isAssignedToMe ? '#10b981' : '#6b7280',
                          display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px'
                        }}>
                          <UserCheck size={10} />
                          <span>{isAssignedToMe ? 'Bạn đang hỗ trợ' : `${s.cskh.username} hỗ trợ`}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Active chat conversation */}
        <div style={{
          flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {!selectedSession ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '12px', display: 'block', margin: '0 auto' }} />
              <h3>Trung tâm Hỗ trợ Khách hàng</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Chọn một cuộc trò chuyện từ danh sách hàng đợi bên trái để bắt đầu nhắn tin.</p>
            </div>
          ) : (
            <>
              {/* Header inside Conversation Panel */}
              <div style={{
                padding: '16px', borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-page)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedSession.student?.avatar ? (
                      <img src={selectedSession.student.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={18} style={{ color: '#6366f1' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                        {selectedSession.student?.username}
                      </span>
                      {selectedSession.student?.premium === 'premium' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {selectedSession.student?.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {(!selectedSession.cskh || selectedSession.cskh._id !== currentUser._id) ? (
                    <button
                      className="btn-primary-admin"
                      onClick={handleAssignSession}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <UserCheck size={14} />
                      Nhận hỗ trợ
                    </button>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', border: '1px solid #10b981', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.05)' }}>
                      <UserCheck size={14} />
                      Bạn hỗ trợ
                    </span>
                  )}

                  <button
                    className="btn-danger-admin"
                    onClick={handleCloseSession}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <XCircle size={14} />
                    Đóng phiên
                  </button>
                </div>
              </div>

              {/* Chat messages history list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-page, #f9fafb)' }}>
                {loadingMessages ? (
                  <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa có tin nhắn nào. Bắt đầu hội thoại hỗ trợ ngay!</div>
                ) : (
                  <>
                    {messages.map(msg => {
                      if (!msg || !msg.sender) return null;
                      const isMe = msg.sender === currentUser?._id || msg.sender?._id === currentUser?._id;
                      return (
                        <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '70%', padding: msg.image ? '4px' : '10px 14px', borderRadius: '12px',
                            borderTopRightRadius: isMe ? '2px' : '12px',
                            borderTopLeftRadius: !isMe ? '2px' : '12px',
                            background: isMe ? 'var(--color-primary, #2563eb)' : 'var(--bg-card, #ffffff)',
                            color: isMe ? 'white' : 'var(--text-body)',
                            fontSize: '0.88rem', lineHeight: 1.4, wordBreak: 'break-word',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            border: isMe ? 'none' : '1px solid var(--border-subtle)'
                          }}>
                            {msg.image && (
                              <a href={getFullUrl(msg.image)} target="_blank" rel="noopener noreferrer" title="Click để xem ảnh lớn">
                                <img 
                                  src={getFullUrl(msg.image)} 
                                  alt="attachment" 
                                  style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block', cursor: 'zoom-in' }} 
                                />
                              </a>
                            )}
                            {msg.text && (
                              <div style={{ padding: msg.image ? '8px 10px 4px' : '0' }}>{msg.text}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {typingStudents[selectedSession.student._id] && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div className="typing-bubble" style={{
                          padding: '10px 14px', borderRadius: '12px',
                          borderTopLeftRadius: '2px',
                          background: 'var(--bg-card, #ffffff)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', minHeight: 38
                        }}>
                          <div className="typing-indicator-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Input box */}
              <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', background: 'var(--bg-card)', alignItems: 'center' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted, #94a3b8)', padding: '6px' }} title="Gửi hình ảnh">
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleChatImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <input
                  type="text"
                  className="form-control-admin"
                  placeholder={
                    selectedSession.cskh?._id === currentUser._id
                      ? "Nhập tin nhắn hỗ trợ học sinh..."
                      : "Nhấp 'Nhận hỗ trợ' hoặc gõ tin nhắn để bắt đầu tư vấn..."
                  }
                  value={chatInput}
                  onChange={handleChatInputChange}
                  style={{ flex: 1, borderRadius: '24px' }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary, #2563eb)',
                    color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    opacity: chatInput.trim() ? 1 : 0.5, transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
