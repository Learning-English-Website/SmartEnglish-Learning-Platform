import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../hooks/useAuth';
import { useWebRTC } from '../../../hooks/useWebRTC';
import axiosClient from '../../../api/axiosClient';
import { adminService } from '../../../services/adminService';
import { MessageSquare, MessageCircle, Send, X, Plus, AlertCircle, Trash2, Image as ImageIcon, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import VideoCallOverlay from '../VideoCall/VideoCallOverlay';
import './SupportChatWidget.css';

export default function SupportChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const { socket, socketRef } = useSocket();
  const webRTC = useWebRTC({ socket, currentUser: user });

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'feedback'

  // Chat states
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cskhIsTyping, setCskhIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Track widget open state for global notification dedup (see SocketContext)
  useEffect(() => {
    window.__supportChatWidgetOpen = isOpen && activeTab === 'chat';
    return () => {
      window.__supportChatWidgetOpen = false;
    };
  }, [isOpen, activeTab]);

  // Feedback states
  const [fbTitle, setFbTitle] = useState('');
  const [fbCategory, setFbCategory] = useState('other');
  const [fbContent, setFbContent] = useState('');
  const [fbAttachments, setFbAttachments] = useState([]); // Array of strings (urls)
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const messageEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isOpen, activeTab]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingHistory(true);
    try {
      const res = await axiosClient.get('/support-chat/messages');
      setSession(res.data.session);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      loadChatHistory();
      setUnreadCount(0);
    }
  }, [isOpen, activeTab, loadChatHistory]);

  // Socket listener for new messages
  useEffect(() => {
    if (!isAuthenticated || !socket) return;

    const handleNewMessage = (payload) => {
      const msg = payload && payload.message ? payload.message : payload;
      if (!msg || !msg._id) return;
      if (!msg.isSystem && !msg.sender) return;

      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      if (payload && payload.session) {
        setSession(payload.session);
      }

      const isMe = msg.sender === user?._id || (msg.sender?._id === user?._id);
      if (!isMe && !msg.isSystem) {
        if (!isOpen || activeTab !== 'chat') {
          setUnreadCount(prev => prev + 1);
          toast(`Tin nhắn mới từ Hỗ trợ viên: ${msg.text}`, { icon: '💬', id: msg._id });
        }
      }
    };

    const handleTypingStatus = (payload) => {
      setCskhIsTyping(payload.isTyping);
    };

    socket.on('support:message:receive', handleNewMessage);
    socket.on('support:typing:receive', handleTypingStatus);

    return () => {
      socket.off('support:message:receive', handleNewMessage);
      socket.off('support:typing:receive', handleTypingStatus);
    };
  }, [isAuthenticated, socket, isOpen, activeTab, user]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput.trim();
    setChatInput('');

    // Stop typing status immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current && socketRef.current) {
      isTypingRef.current = false;
      socketRef.current.emit('support:typing:send', { isTyping: false });
    }

    try {
      const res = await axiosClient.post('/support-chat/messages', { text: textToSend });
      setMessages(prev => {
        if (prev.some(m => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
    } catch {
      toast.error('Không thể gửi tin nhắn. Thử lại sau.');
    }
  };

  // Request human CSKH
  const handleRequestCSKH = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axiosClient.post('/support-chat/request-cskh');
      setSession(res.data);
      toast.success('Đã gửi yêu cầu kết nối với nhân viên hỗ trợ.');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Yêu cầu kết nối thất bại.';
      toast.error(errMsg);
    }
  };

  const handleChatInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);

    if (!socketRef.current) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current.emit('support:typing:send', { isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketRef.current.emit('support:typing:send', { isTyping: false });
    }, 2500);
  };

  // Image Upload handler for Live Chat
  const handleChatImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      
      const messageRes = await axiosClient.post('/support-chat/messages', { image: res.url });
      setMessages(prev => {
        if (prev.some(m => m._id === messageRes.data._id)) return prev;
        return [...prev, messageRes.data];
      });
      toast.success('Gửi ảnh thành công', { id: loadingToastId });
    } catch {
      toast.error('Gửi ảnh thất bại', { id: loadingToastId });
    }
  };

  // Image Upload handler for Feedback
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axiosClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFbAttachments(prev => [...prev, res.url]);
      toast.success('Tải ảnh lên thành công');
    } catch {
      toast.error('Tải ảnh lên thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAttachment = (idxToRemove) => {
    setFbAttachments(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!fbTitle.trim() || !fbContent.trim()) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await adminService.submitFeedback({
        title: fbTitle.trim(),
        content: fbContent.trim(),
        category: fbCategory,
        attachments: fbAttachments
      });
      toast.success('Đã gửi phản hồi. Chúng tôi sẽ phản hồi sớm nhất!');
      // Reset form
      setFbTitle('');
      setFbCategory('other');
      setFbContent('');
      setFbAttachments([]);
      setActiveTab('chat');
    } catch {
      toast.error('Không thể gửi phản hồi. Thử lại sau.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!isAuthenticated) return null;

  // Helper to format API URLs for local files
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const normalizedBase = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
    return `${normalizedBase}${url}`;
  };

  return (
    <div className="support-widget-container">
      {/* Floating Button */}
      <button 
        className="support-trigger-btn"
        onClick={() => setIsOpen(prev => !prev)}
        title="Trợ giúp & Hỗ trợ"
        style={{ position: 'relative' }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {unreadCount > 0 && !isOpen && (
          <div className="support-badge-unread" style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            minWidth: 20,
            height: 20,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
            border: '2px solid var(--bg-card, #ffffff)'
          }}>
            {unreadCount}
          </div>
        )}
      </button>

      {/* Chat Card */}
      {isOpen && (
        <div className="support-chat-card">
          {/* Header */}
          <div className="support-card-header">
            <div className="support-card-header-info">
              <div style={{ position: 'relative' }}>
                <div className="support-avatar-circle">SP</div>
                <div className="support-status-dot" />
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Hỗ trợ trực tuyến</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>Luôn sẵn sàng trợ giúp</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isAuthenticated && activeTab === 'chat' && (
                <button
                  type="button"
                  className={`support-request-cskh-btn ${session?.status === 'waiting' ? 'waiting' : ''}`}
                  onClick={handleRequestCSKH}
                  disabled={session?.status === 'waiting' || (session?.cskh !== null && session?.cskh !== undefined)}
                  title={
                    session?.cskh
                      ? "Đang có nhân viên hỗ trợ"
                      : session?.status === 'waiting'
                        ? "Đang chờ kết nối..."
                        : "Yêu cầu gặp tư vấn viên"
                  }
                >
                  <Headphones size={13} />
                  <span className="support-request-btn-text">
                    {session?.cskh
                      ? "Đã kết nối"
                      : session?.status === 'waiting'
                        ? "Đang chờ..."
                        : session?.status === 'closed'
                          ? "Kết nối lại"
                          : "Gặp nhân viên"}
                  </span>
                </button>
              )}
              <button className="support-card-close-btn" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="support-card-tabs">
            <button
              className={`support-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Trò chuyện trực tuyến
            </button>
            <button
              className={`support-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              Góp ý &amp; Báo lỗi
            </button>
          </div>

          {/* Tab Content 1: Live Chat */}
          {activeTab === 'chat' && (
            <div className="support-chat-tab-panel">
              <div className="support-message-list">
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '0 20px' }}>
                    <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Xin chào {user?.username}!</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Bạn cần hỗ trợ gì? Nhập tin nhắn bên dưới để trò chuyện trực tiếp với chúng tôi.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      if (!msg) return null;

                      // Render system messages
                      if (msg.isSystem) {
                        return (
                          <div key={msg._id} className="support-chat-msg-system">
                            <span className="support-system-text">{msg.text}</span>
                          </div>
                        );
                      }

                      if (!msg.sender) return null;

                      const isMe = msg.sender === user?._id || (msg.sender?._id === user?._id);
                      const isAi = msg.sender?.email === 'ai-assistant@smartenglish.com' || msg.sender?.username === 'AI Assistant';
                      const senderName = isAi ? 'Trợ lý AI' : (msg.sender?.username || 'Hỗ trợ viên');
                      const avatarUrl = msg.sender?.avatar;

                      return (
                        <div key={msg._id} className={`support-chat-msg-row ${isMe ? 'sent' : 'received'} ${isAi ? 'ai-msg' : ''}`}>
                          {!isMe && (
                            <div className="support-msg-avatar-container">
                              {isAi ? (
                                <div className="support-ai-avatar-badge" title="Trợ lý AI">
                                  🤖
                                </div>
                              ) : avatarUrl ? (
                                <img src={getFullUrl(avatarUrl)} alt="avatar" className="support-msg-avatar-img" />
                              ) : (
                                <div className="support-msg-avatar-fallback">{senderName.charAt(0)}</div>
                              )}
                            </div>
                          )}
                          <div className="support-bubble-container">
                            {!isMe && (
                              <div className="support-msg-sender-name">
                                {senderName}
                                {isAi && <span className="support-ai-badge">Bot</span>}
                              </div>
                            )}
                            <div className="support-bubble" style={{ padding: msg.image ? '4px' : '10px 14px', maxWidth: '100%', wordBreak: 'break-word' }}>
                              {msg.image && (
                                <a href={getFullUrl(msg.image)} target="_blank" rel="noopener noreferrer" title="Click để xem ảnh lớn">
                                  <img 
                                    src={getFullUrl(msg.image)} 
                                    alt="attachment" 
                                    style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', display: 'block', cursor: 'zoom-in' }} 
                                  />
                                </a>
                              )}
                              {msg.text && (
                                <div style={{ padding: msg.image ? '8px 10px 4px' : '0' }}>{msg.text}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {cskhIsTyping && (
                      <div className="support-chat-msg-row received">
                        <div className="support-msg-avatar-container">
                          <div className="support-msg-avatar-fallback">H</div>
                        </div>
                        <div className="support-bubble-container">
                          <div className="support-msg-sender-name">Đang trả lời...</div>
                          <div className="support-bubble typing-bubble" style={{ display: 'flex', alignItems: 'center', minHeight: 38 }}>
                            <div className="typing-indicator-dots">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Chat Input */}
              {session?.status === 'waiting' && (
                <div className="support-waiting-banner">
                  <div className="support-waiting-pulse" />
                  <span>Đang kết nối với nhân viên hỗ trợ...</span>
                </div>
              )}
              {session?.status === 'closed' && (
                <div className="support-closed-banner" style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  padding: '8px 12px',
                  margin: '8px 12px 0 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#2563eb',
                  textAlign: 'center',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  fontWeight: 500
                }}>
                  Nhân viên hỗ trợ đã kết thúc phiên. Bạn vẫn có thể nhắn tiếp với Trợ lý AI hoặc bấm Kết nối lại để gặp nhân viên.
                </div>
              )}
              <form className="support-chat-footer" onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label 
                  className="support-chat-upload-btn" 
                  title="Gửi hình ảnh" 
                  style={{ 
                    cursor: loadingHistory ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: 'var(--text-muted, #94a3b8)', 
                    padding: '6px',
                    opacity: loadingHistory ? 0.5 : 1
                  }}
                >
                  <ImageIcon size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleChatImageUpload}
                    disabled={loadingHistory}
                    style={{ display: 'none' }}
                  />
                </label>
                <input
                  type="text"
                  className="support-chat-input"
                  placeholder={session?.status === 'closed' ? "Nhập tin nhắn để chat tiếp với Trợ lý AI..." : "Nhập tin nhắn..."}
                  value={chatInput}
                  onChange={handleChatInputChange}
                  disabled={loadingHistory}
                  style={{ flex: 1 }}
                />
                <button 
                  type="submit" 
                  className="support-chat-send-btn"
                  disabled={!chatInput.trim() || loadingHistory}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}

          {/* Tab Content 2: Feedback & Bug report */}
          {activeTab === 'feedback' && (
            <form className="support-feedback-tab-panel" onSubmit={handleFeedbackSubmit}>
              {/* Tiêu đề */}
              <div className="support-fb-field">
                <label>Tiêu đề phản hồi</label>
                <input
                  type="text"
                  className="support-fb-input"
                  value={fbTitle}
                  onChange={e => setFbTitle(e.target.value)}
                  placeholder="Vấn đề bạn gặp phải là gì?"
                  required
                />
              </div>

              {/* Phân loại */}
              <div className="support-fb-field">
                <label>Phân loại</label>
                <select
                  className="support-fb-input"
                  value={fbCategory}
                  onChange={e => setFbCategory(e.target.value)}
                >
                  <option value="bug">Báo lỗi hệ thống</option>
                  <option value="feature">Góp ý tính năng mới</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              {/* Nội dung */}
              <div className="support-fb-field" style={{ flex: 1 }}>
                <label>Nội dung chi tiết</label>
                <textarea
                  className="support-fb-input"
                  value={fbContent}
                  onChange={e => setFbContent(e.target.value)}
                  placeholder="Mô tả chi tiết lỗi hoặc mong muốn của bạn..."
                  rows={4}
                  style={{ flex: 1, height: 'auto', resize: 'none' }}
                  required
                />
              </div>

              {/* Attachments */}
              <div className="support-fb-field">
                <label>Hình ảnh đính kèm</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {fbAttachments.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={getFullUrl(url)} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAttachment(idx)}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  
                  {fbAttachments.length < 3 && (
                    <label style={{ width: '50px', height: '50px', borderRadius: '4px', border: '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-page)' }} title="Thêm ảnh">
                      {uploadingImage ? (
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Tải...</div>
                      ) : (
                        <>
                          <ImageIcon size={16} style={{ color: 'var(--text-muted)' }} />
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        disabled={uploadingImage}
                        style={{ display: 'none' }} 
                      />
                    </label>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="support-fb-submit-btn"
                disabled={submittingFeedback || uploadingImage}
              >
                {submittingFeedback ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </form>
          )}
        </div>
      )}
      <VideoCallOverlay
        callStatus={webRTC.callStatus}
        callInfo={webRTC.callInfo}
        localStream={webRTC.localStream}
        remoteStream={webRTC.remoteStream}
        isMicMuted={webRTC.isMicMuted}
        isCameraOff={webRTC.isCameraOff}
        error={webRTC.error}
        onAccept={webRTC.acceptCall}
        onReject={webRTC.rejectCall}
        onHangup={() => webRTC.hangup()}
        onToggleMic={webRTC.toggleMic}
        onToggleCamera={webRTC.toggleCamera}
      />
    </div>
  );
}
