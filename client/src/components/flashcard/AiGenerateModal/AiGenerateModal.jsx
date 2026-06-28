import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Tabs, Tab, Alert, Table, Spinner, Badge } from 'react-bootstrap';
import { FiCpu, FiTrash2, FiPlus, FiSave, FiX, FiAlertTriangle, FiCheck, FiSettings, FiVolume2, FiBookOpen } from 'react-icons/fi';
import { aiService } from '../../../api/aiService';
import { toast } from 'react-hot-toast';
import './AiGenerateModal.css';

const LOADING_MESSAGES = [
  'Đang khởi tạo kết nối với Gemini AI...',
  'Đang đọc nội dung và phân tích ngôn ngữ...',
  'Đang trích xuất từ vựng phù hợp với trình độ...',
  'Đang xây dựng định nghĩa, phiên âm và câu ví dụ minh họa...',
  'Đang chuẩn hóa dữ liệu thẻ học dưới dạng JSON...',
  'Sắp xong rồi, hãy đợi một chút nhé...',
];

/**
 * AiGenerateModal — AI Flashcard Generator & Draft Editor Modal
 *
 * @param {boolean} show - Whether modal is visible
 * @param {function} onHide - Close callback
 * @param {string} setId - ID of the flashcard set to add cards to
 * @param {function} onConfirmSave - Callback when user commits drafts: (cards: Array) => Promise<void>
 * @param {boolean} saving - Parent state showing if bulk save is currently executing
 * @param {function} onOpenKeyModal - Callback to trigger key configuration modal directly
 */
export default function AiGenerateModal({ show, onHide, setId, onConfirmSave, saving, onOpenKeyModal }) {
  const [activeTab, setActiveTab] = useState('topic');
  
  // Form values
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [level, setLevel] = useState('B1-B2');
  const [count, setCount] = useState(10);
  
  // Key status cache
  const [hasKey, setHasKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  
  // Generation states
  const [generating, setGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [draftCards, setDraftCards] = useState([]); // List of { front, back, pronunciation, example }
  const [errorText, setErrorText] = useState('');
  const [errorCode, setErrorCode] = useState(null); // 'KEY_MISSING', 'SAFETY', 'RATE_LIMIT', etc.

  const messageIntervalRef = useRef(null);

  // Check key status on show
  useEffect(() => {
    if (show) {
      checkKeyStatus();
      // Reset state if not in draft mode
      if (draftCards.length === 0) {
        setErrorText('');
        setErrorCode(null);
      }
    }
  }, [show]);



  // Loading message rotation
  useEffect(() => {
    if (generating) {
      setLoadingMsgIndex(0);
      messageIntervalRef.current = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    } else {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    }
    return () => {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, [generating]);

  const checkKeyStatus = async () => {
    setCheckingKey(true);
    try {
      const res = await aiService.getAiKeyStatus();
      const statusData = res?.data ?? res;
      setHasKey(!!statusData.hasGeminiKey);
    } catch {
      setHasKey(false);
    } finally {
      setCheckingKey(false);
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setErrorText('');
    setErrorCode(null);

    // Form validation
    if (activeTab === 'topic' && !topic.trim()) {
      toast.error('Vui lòng điền chủ đề cần sinh từ vựng');
      return;
    }
    if (activeTab === 'text' && !text.trim()) {
      toast.error('Vui lòng dán đoạn văn bản nguồn');
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        mode: activeTab,
        topic: activeTab === 'topic' ? topic.trim() : undefined,
        text: activeTab === 'text' ? text.trim() : undefined,
        level,
        count: Number(count),
        setId
      };

      const res = await aiService.generateFlashcards(payload);
      // Backend returns ApiResponse.success(flashcards)
      // res.data is expected to be { success: true, data: [ ...cards ] }
      const responseData = res?.data ?? res;
      
      if (Array.isArray(responseData)) {
        setDraftCards(responseData);
        toast.success(`Đã sinh thành công ${responseData.length} thẻ học nháp!`);
      } else if (responseData?.flashcards && Array.isArray(responseData.flashcards)) {
        setDraftCards(responseData.flashcards);
        toast.success(`Đã sinh thành công ${responseData.flashcards.length} thẻ học nháp!`);
      } else if (responseData?.cards && Array.isArray(responseData.cards)) {
        setDraftCards(responseData.cards);
        toast.success(`Đã sinh thành công ${responseData.cards.length} thẻ học nháp!`);
      } else {
        throw new Error('Định dạng phản hồi từ AI không đúng cấu trúc danh sách.');
      }
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const serverMsg = data?.error?.message || data?.message || err.message;
      
      console.error('AI Generation Error:', err);

      if (status === 428 || status === 401) {
        setErrorCode('KEY_MISSING');
        setErrorText('Chưa có cấu hình Gemini API Key hoặc Key đã hết hạn. Vui lòng bấm vào nút cấu hình key bên dưới để tiếp tục.');
      } else if (status === 429) {
        setErrorCode('RATE_LIMIT');
        setErrorText(serverMsg || 'Tài khoản của bạn hoặc API Key đã vượt quá tần suất gọi API (Giới hạn: 30 lần/phút). Vui lòng thử lại sau ít phút.');
      } else if (status === 422) {
        setErrorCode('SAFETY');
        setErrorText('Nội dung chủ đề hoặc văn bản nhập vào bị Gemini AI chặn do vi phạm chính sách an toàn thông tin.');
      } else if (status === 504) {
        setErrorCode('TIMEOUT');
        setErrorText(serverMsg || 'AI phản hồi lâu hơn dự kiến. Vui lòng thử lại sau ít phút hoặc giảm số lượng thẻ.');
      } else {
        setErrorCode('GENERAL');
        setErrorText(serverMsg || 'Không thể tạo flashcard. Vui lòng thử lại hoặc đổi chủ đề.');
      }
      toast.error('Sinh thẻ bằng AI thất bại.');
    } finally {
      setGenerating(false);
    }
  };

  // Draft editing helpers
  const handleEditDraftCard = (index, field, value) => {
    setDraftCards((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleDeleteDraftCard = (index) => {
    setDraftCards((prev) => prev.filter((_, i) => i !== index));
    toast.success('Đã xóa thẻ khỏi danh sách nháp.');
  };

  const handleAddBlankDraftCard = () => {
    setDraftCards((prev) => [
      ...prev,
      { front: '', back: '', pronunciation: '', example: '' },
    ]);
    toast.success('Đã thêm 1 dòng trống mới.');
  };

  const handleCommitSave = async () => {
    // Validate drafts before saving
    const validDrafts = draftCards.filter(c => c.front?.trim() && c.back?.trim());
    if (validDrafts.length === 0) {
      toast.error('Không có thẻ nào hợp lệ (cần điền ít nhất mặt trước và mặt sau)');
      return;
    }

    try {
      await onConfirmSave(validDrafts);
      // Clean up drafts on successful save
      setDraftCards([]);
      onHide();
    } catch (err) {
      // Errors are toasted in SetDetail
    }
  };

  const handleDiscardDrafts = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy danh sách thẻ nháp này?')) {
      setDraftCards([]);
      setErrorText('');
      setErrorCode(null);
    }
  };

  // UI rendering switch
  const isDraftMode = draftCards.length > 0;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="am-modal"
      dialogClassName={isDraftMode ? 'am-modal-dialog--draft' : 'am-modal-dialog--config'}
    >
      <Modal.Header closeButton className="am-header" disabled={generating || saving}>
        <Modal.Title className="am-title d-flex align-items-center gap-2">
          <FiCpu className="am-title-icon" />
          <span>{isDraftMode ? 'Bản nháp Flashcard AI sinh' : 'Tạo bằng AI (Gemini Studio)'}</span>
          {isDraftMode && (
            <Badge bg="primary-subtle" className="am-badge-count ms-2">
              {draftCards.length} thẻ
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="am-body">
        {/* Loading overlay when generating */}
        {generating && (
          <div className="am-loading-overlay">
            <div className="am-loading-content">
              <Spinner animation="border" variant="primary" className="am-spinner mb-3" />
              <h5 className="am-loading-title">Đang sinh từ vựng...</h5>
              <p className="am-loading-text text-muted">{LOADING_MESSAGES[loadingMsgIndex]}</p>
            </div>
          </div>
        )}

        {/* STEP 1: CONFIGURE & GENERATE FORM */}
        {!isDraftMode && (
          <>
            {/* Quick API Key status alert */}
            {!checkingKey && !hasKey && (
              <Alert variant="warning" className="am-key-alert d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                  <FiAlertTriangle className="text-warning flex-shrink-0" size={20} />
                  <div>
                    <span className="fw-semibold">Chưa có API Key!</span> Bạn cần cấu hình Gemini API Key cá nhân để sử dụng tính năng này hoàn toàn miễn phí.
                  </div>
                </div>
                <Button variant="warning" size="sm" onClick={onOpenKeyModal} className="d-flex align-items-center gap-1">
                  <FiSettings size={14} /> Cấu hình Key
                </Button>
              </Alert>
            )}

            {/* Error alerts from last generation try */}
            {errorText && (
              <Alert variant="danger" className="mb-4">
                <div className="d-flex align-items-center gap-2 fw-semibold text-danger-emphasis">
                  <FiAlertTriangle size={18} />
                  Gặp sự cố khi sinh thẻ học
                </div>
                <p className="mb-2 mt-1 small">{errorText}</p>
                {errorCode === 'KEY_MISSING' && (
                  <Button variant="outline-danger" size="sm" onClick={onOpenKeyModal} className="d-flex align-items-center gap-1">
                    <FiSettings size={14} /> Cấu hình Gemini Key
                  </Button>
                )}
              </Alert>
            )}

            <Form onSubmit={handleGenerate}>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="am-tabs mb-4"
              >
                <Tab eventKey="topic" title="Tạo từ Chủ đề (Prompt)">
                  <Form.Group className="mb-3 mt-2">
                    <Form.Label className="fw-semibold">Mô tả chủ đề muốn tạo từ vựng</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ví dụ: Từ vựng tiếng Anh chủ đề Thời tiết, Phỏng vấn xin việc, IELTS Speaking Part 1..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="am-input-control"
                      disabled={generating}
                      maxLength={120}
                    />
                    <Form.Text className="text-muted text-xs">
                      Gemini sẽ sinh các từ vựng tiêu biểu, giải nghĩa, phiên âm và ví dụ thực tế tương ứng với chủ đề này.
                    </Form.Text>
                  </Form.Group>
                </Tab>

                <Tab eventKey="text" title="Tạo từ Đoạn văn/Văn bản">
                  <Form.Group className="mb-3 mt-2">
                    <Form.Label className="fw-semibold">Dán đoạn văn bản tiếng Anh</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      placeholder="Dán đoạn văn, bài báo, bài viết tiếng Anh bạn muốn học từ vựng... Hệ thống sẽ tự lọc từ quan trọng."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="am-input-control"
                      disabled={generating}
                    />
                    <Form.Text className="text-muted text-xs">
                      AI sẽ tự động đọc hiểu đoạn văn, trích xuất các từ mới nổi bật để tạo bộ flashcard cho bạn.
                    </Form.Text>
                  </Form.Group>
                </Tab>
              </Tabs>

              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Trình độ từ vựng mục tiêu</Form.Label>
                    <Form.Select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="am-input-control"
                      disabled={generating}
                    >
                      <option value="A1-A2">Cơ bản (Sơ cấp A1 - A2)</option>
                      <option value="B1-B2">Trung cấp (B1 - B2)</option>
                      <option value="C1-C2">Nâng cao (C1 - C2)</option>
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Số lượng thẻ muốn tạo ({count})</Form.Label>
                    <div className="d-flex align-items-center gap-3">
                      <Form.Range
                        min={5}
                        max={20}
                        step={1}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        disabled={generating}
                        className="flex-grow-1"
                      />
                      <Form.Control
                        type="number"
                        min={5}
                        max={20}
                        value={count}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 1 && val <= 20) setCount(val);
                        }}
                        style={{ width: '70px' }}
                        disabled={generating}
                      />
                    </div>
                  </Form.Group>
                </div>
              </div>

              <div className="am-modal-footer">
                <div className="d-flex align-items-center gap-1 text-muted cursor-pointer" onClick={onOpenKeyModal}>
                  <FiSettings size={14} />
                  <span style={{ fontSize: '0.8rem', textDecoration: 'underline' }}>Cài đặt API Key</span>
                </div>
                <div className="d-flex gap-2">
                  <Button variant="secondary" onClick={onHide} disabled={generating} className="am-btn-slim">
                    Đóng
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={generating || (!hasKey && !checkingKey)}
                    className="am-btn-slim"
                  >
                    <FiCpu /> Bắt đầu tạo bằng AI
                  </Button>
                </div>
              </div>
            </Form>
          </>
        )}

        {/* STEP 2: PREVIEW & EDIT DRAFTS */}
        {isDraftMode && (
          <div className="am-draft-section">
            <Alert variant="info" className="py-2 px-3 mb-3 d-flex align-items-center gap-2">
              <FiBookOpen size={18} className="text-info" />
              <div className="small">
                <strong>Chế độ Xem trước bản nháp:</strong> Dưới đây là danh sách từ vựng được sinh ra. Bạn có thể sửa đổi nội dung trực tiếp tại các ô nhập liệu hoặc xóa các từ không mong muốn trước khi nhấn lưu.
              </div>
            </Alert>

            <div className="am-table-responsive mb-4">
              <Table bordered hover className="am-draft-table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} className="text-center">#</th>
                    <th style={{ width: '22%' }}>Thuật ngữ (Front)</th>
                    <th style={{ width: '25%' }}>Định nghĩa (Back)</th>
                    <th style={{ width: '15%' }} className="text-center">Phiên âm</th>
                    <th>Ví dụ minh họa</th>
                    <th style={{ width: '50px' }} className="text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {draftCards.map((card, idx) => (
                    <tr key={idx}>
                      <td className="text-center text-muted fw-bold">{idx + 1}</td>
                      <td>
                        <Form.Control
                          type="text"
                          value={card.front}
                          onChange={(e) => handleEditDraftCard(idx, 'front', e.target.value)}
                          placeholder="Thuật ngữ"
                          className="am-table-input fw-semibold"
                          isInvalid={!card.front?.trim()}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={card.back}
                          onChange={(e) => handleEditDraftCard(idx, 'back', e.target.value)}
                          placeholder="Giải nghĩa Tiếng Việt"
                          className="am-table-input"
                          isInvalid={!card.back?.trim()}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={card.pronunciation || ''}
                          onChange={(e) => handleEditDraftCard(idx, 'pronunciation', e.target.value)}
                          placeholder="Phiên âm"
                          className="am-table-input text-muted text-center"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={card.example || ''}
                          onChange={(e) => handleEditDraftCard(idx, 'example', e.target.value)}
                          placeholder="Ví dụ minh họa tiếng Anh"
                          className="am-table-input"
                        />
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteDraftCard(idx)}
                          className="am-table-del-btn"
                        >
                          <FiTrash2 size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

             <div className="am-modal-footer">
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={handleAddBlankDraftCard}
                  disabled={saving}
                  className="am-btn-slim"
                >
                  <FiPlus /> Thêm dòng mới
                </Button>
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="outline-danger"
                  onClick={handleDiscardDrafts}
                  disabled={saving}
                  className="am-btn-slim"
                >
                  <FiX /> Hủy bản nháp
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCommitSave}
                  disabled={saving || draftCards.length === 0}
                  className="am-btn-slim"
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-1" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave /> Lưu vào học phần
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
