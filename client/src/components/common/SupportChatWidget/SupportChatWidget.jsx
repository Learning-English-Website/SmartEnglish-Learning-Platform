import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../hooks/useAuth';
import axiosClient from '../../../api/axiosClient';
import { adminService } from '../../../services/adminService';
import { MessageSquare, MessageCircle, Send, X, Plus, AlertCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import './SupportChatWidget.css';

export default function SupportChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const { socket, socketRef } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'feedback'

  // Chat states
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

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
      setSession(res.data.data.session);
      setMessages(res.data.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      loadChatHistory();
    }
  }, [isOpen, activeTab, loadChatHistory]);

  // Socket listener for new messages
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewMessage = (msg) => {
      // Check if message belongs to this student session
      if (session && msg.session === session._id) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        // Fallback: reload history if session isn't loaded yet
        loadChatHistory();
      }
    };

    const socketInst = socketRef.current;
    socketInst?.on('support:message:receive', handleNewMessage);

    return () => {
      socketInst?.off('support:message:receive', handleNewMessage);
    };
  }, [isAuthenticated, session, socketRef, loadChatHistory]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput.trim();
    setChatInput('');

    try {
      const res = await axiosClient.post('/support-chat/messages', { text: textToSend });
      setMessages(prev => {
        if (prev.some(m => m._id === res.data.data._id)) return prev;
        return [...prev, res.data.data];
      });
    } catch {
      toast.error('Không thể gửi tin nhắn. Thử lại sau.');
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
      setFbAttachments(prev => [...prev, res.data.url]);
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
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
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
            <button className="support-card-close-btn" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
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
                      const isMe = msg.sender === user._id || (msg.sender?._id === user._id);
                      return (
                        <div key={msg._id} className={`support-chat-msg-row ${isMe ? 'sent' : 'received'}`}>
                          <div className="support-bubble">
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Chat Input */}
              <form className="support-chat-footer" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="support-chat-input"
                  placeholder="Nhập tin nhắn..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={loadingHistory}
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
    </div>
  );
}
