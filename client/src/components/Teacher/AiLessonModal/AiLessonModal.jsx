import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Alert, Table, Spinner, Badge, Card } from 'react-bootstrap';
import { FiCpu, FiTrash2, FiPlus, FiSave, FiX, FiAlertTriangle, FiCheck, FiSettings, FiBookOpen, FiArrowRight, FiActivity } from 'react-icons/fi';
import { aiService } from '../../../api/aiService';
import { teacherService } from '../../../services/teacherService';
import GeminiKeyModal from '../../flashcard/GeminiKeyModal/GeminiKeyModal';
import { toast } from 'react-hot-toast';
import './AiLessonModal.css';

const LOADING_MESSAGES = [
  'Đang kết nối tới Gemini AI để lập kế hoạch...',
  'Đang phác thảo chủ đề và mục tiêu ngữ pháp...',
  'Đang soạn các câu hỏi trắc nghiệm ngữ cảnh...',
  'Đang biên dịch và thiết kế đáp án nhiễu...',
  'Đang sắp xếp từ vựng và cấu trúc xáo trộn...',
  'Sắp hoàn tất bài học rồi, vui lòng đợi một chút...',
];

const AI_CHALLENGE_TYPES = [
  { id: 'ASSIST', label: 'Trắc nghiệm chữ', desc: 'Chọn 1 đáp án đúng' },
  { id: 'TYPE', label: 'Gõ đáp án', desc: 'Nhập câu trả lời ngắn' },
  { id: 'TRANSLATE', label: 'Dịch thuật', desc: 'Dịch Anh - Việt hoặc Việt - Anh' },
  { id: 'COMPLETE', label: 'Hoàn thành câu', desc: 'Nhập từ/cụm từ còn thiếu' },
  { id: 'ORDER', label: 'Sắp xếp từ', desc: 'Ghép từ thành câu đúng' },
  { id: 'MATCH', label: 'Ghép cặp', desc: 'Nối cặp từ/nghĩa tương ứng' },
  { id: 'FILL', label: 'Điền khuyết', desc: 'Chọn đáp án điền vào chỗ trống' },
];

const DEFAULT_AI_CHALLENGE_TYPES = ['ASSIST', 'TRANSLATE', 'FILL', 'ORDER'];

const getChallengeTypeLabel = (type) => {
  const found = AI_CHALLENGE_TYPES.find(item => item.id === type);
  return found ? `${found.label} (${found.id})` : type;
};

const parsePairsText = (value) => value
  .split('\n')
  .map(line => line.split('|').map(part => part.trim()))
  .filter(parts => parts.length >= 2 && parts[0] && parts[1])
  .map(parts => ({ left: parts[0], right: parts.slice(1).join(' | ') }));

const stringifyPairs = (pairs) => Array.isArray(pairs)
  ? pairs.map(pair => `${pair.left || ''} | ${pair.right || ''}`).join('\n')
  : '';

export default function AiLessonModal({ show, onHide, unitId, onSuccess }) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B1-B2');
  const [count, setCount] = useState(8);
  const [selectedChallengeTypes, setSelectedChallengeTypes] = useState(DEFAULT_AI_CHALLENGE_TYPES);
  
  // API key status
  const [hasKey, setHasKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Generation states
  const [generating, setGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [errorCode, setErrorCode] = useState(null);

  // Draft Lesson state
  const [draftLesson, setDraftLesson] = useState(null); // { title, subtitle, grammarFocus: [], vocabFocus: [], challenges: [] }
  const [saving, setSaving] = useState(false);

  const messageIntervalRef = useRef(null);

  // Check key on show
  useEffect(() => {
    if (show) {
      checkKeyStatus();
      if (!draftLesson) {
        setErrorText('');
        setErrorCode(null);
      }
    }
  }, [show]);

  // Loading rotation
  useEffect(() => {
    if (generating) {
      setLoadingMsgIndex(0);
      messageIntervalRef.current = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    } else {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
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
    if (!topic.trim()) {
      toast.error('Vui lòng nhập chủ đề hoặc điểm ngữ pháp cốt lõi');
      return;
    }

    if (selectedChallengeTypes.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 dạng câu hỏi để AI tạo.');
      return;
    }

    setGenerating(true);
    setErrorText('');
    setErrorCode(null);

    try {
      const res = await aiService.generateLesson({
        topic: topic.trim(),
        level,
        count: Number(count),
        challengeTypes: selectedChallengeTypes,
      });

      const responseData = res?.data ?? res;
      if (responseData?.success && responseData?.lesson) {
        setDraftLesson(responseData.lesson);
        toast.success('Đã thiết kế xong bài học nháp từ AI!');
      } else {
        throw new Error('Định dạng bài học từ AI trả về không hợp lệ.');
      }
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const serverMsg = data?.error?.message || data?.message || err.message;

      console.error('Lesson Generation Error:', err);

      if (status === 428 || status === 401) {
        setErrorCode('KEY_MISSING');
        setErrorText('Chưa có cấu hình Gemini API Key hoặc Key hết hạn. Vui lòng bấm vào nút Cấu hình Key.');
      } else if (status === 429) {
        setErrorCode('RATE_LIMIT');
        setErrorText(serverMsg || 'Bạn đã vượt quá tần suất gọi API (Giới hạn: 30 lần/phút). Vui lòng đợi ít phút.');
      } else if (status === 422) {
        setErrorCode('SAFETY');
        setErrorText(serverMsg || 'Nội dung chủ đề vi phạm chính sách an toàn của Gemini AI.');
      } else if (status === 504) {
        setErrorCode('TIMEOUT');
        setErrorText(serverMsg || 'AI phản hồi lâu hơn dự kiến. Vui lòng thử lại sau ít phút hoặc giảm số lượng câu hỏi.');
      } else {
        setErrorCode('GENERAL');
        setErrorText(serverMsg || 'Không thể tạo bài học nháp. Vui lòng thử lại.');
      }
      toast.error('Sinh bài học bằng AI thất bại.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleChallengeType = (type) => {
    setSelectedChallengeTypes((prev) => (
      prev.includes(type)
        ? prev.filter(item => item !== type)
        : [...prev, type]
    ));
  };

  // Editing handlers for Draft Lesson
  const handleEditLessonMeta = (field, value) => {
    setDraftLesson((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditChallenge = (index, field, value) => {
    setDraftLesson((prev) => {
      const updatedChallenges = [...prev.challenges];
      updatedChallenges[index] = {
        ...updatedChallenges[index],
        [field]: value,
      };
      
      // Auto-sync wordBank and correctOrder for ORDER challenges when correctAnswer changes
      if (field === 'correctAnswer' && updatedChallenges[index].type === 'ORDER') {
        const words = value.split(/\s+/).filter(Boolean);
        updatedChallenges[index].wordBank = words;
        updatedChallenges[index].correctOrder = words.map((_, i) => i);
      }

      return {
        ...prev,
        challenges: updatedChallenges,
      };
    });
  };

  const handleEditOption = (chIdx, optIdx, field, value) => {
    setDraftLesson((prev) => {
      const updatedChallenges = [...prev.challenges];
      const updatedOptions = [...updatedChallenges[chIdx].options];
      
      if (field === 'correct' && value === true) {
        // ASSIST/FILL can only have 1 correct option
        updatedOptions.forEach((opt, idx) => {
          opt.correct = idx === optIdx;
        });
      } else {
        updatedOptions[optIdx] = {
          ...updatedOptions[optIdx],
          [field]: value,
        };
      }

      updatedChallenges[chIdx] = {
        ...updatedChallenges[chIdx],
        options: updatedOptions,
      };

      // Sync correctAnswer value for ASSIST/FILL
      const correctOpt = updatedOptions.find(o => o.correct);
      if (correctOpt) {
        updatedChallenges[chIdx].correctAnswer = correctOpt.text;
      }

      return {
        ...prev,
        challenges: updatedChallenges,
      };
    });
  };

  const handleDeleteChallenge = (index) => {
    setDraftLesson((prev) => ({
      ...prev,
      challenges: prev.challenges.filter((_, i) => i !== index),
    }));
    toast.success('Đã xóa câu hỏi khỏi bài tập nháp.');
  };

  const handleAddOption = (chIdx) => {
    setDraftLesson((prev) => {
      const updatedChallenges = [...prev.challenges];
      const updatedOptions = [...(updatedChallenges[chIdx].options || [])];
      
      if (updatedOptions.length >= 6) {
        toast.error('Tối đa 6 lựa chọn đáp án.');
        return prev;
      }

      updatedOptions.push({ text: '', correct: updatedOptions.length === 0 });
      updatedChallenges[chIdx] = {
        ...updatedChallenges[chIdx],
        options: updatedOptions,
      };

      return {
        ...prev,
        challenges: updatedChallenges,
      };
    });
  };

  const handleDeleteOption = (chIdx, optIdx) => {
    setDraftLesson((prev) => {
      const updatedChallenges = [...prev.challenges];
      let updatedOptions = [...updatedChallenges[chIdx].options];
      
      const wasCorrect = updatedOptions[optIdx].correct;
      updatedOptions = updatedOptions.filter((_, idx) => idx !== optIdx);
      
      if (wasCorrect && updatedOptions.length > 0) {
        updatedOptions[0].correct = true;
      }

      updatedChallenges[chIdx] = {
        ...updatedChallenges[chIdx],
        options: updatedOptions,
      };

      return {
        ...prev,
        challenges: updatedChallenges,
      };
    });
  };

  const handleAddChallenge = (type) => {
    const newCh = {
      type,
      question: '',
      correctAnswer: '',
    };

    if (type === 'ASSIST' || type === 'FILL') {
      newCh.options = [
        { text: '', correct: true },
        { text: '', correct: false },
        { text: '', correct: false },
      ];
      if (type === 'FILL') {
        newCh.sentence = 'He ___ a student.';
      }
    } else if (type === 'TRANSLATE') {
      newCh.sourceLang = 'vi';
      newCh.targetLang = 'en';
    } else if (type === 'ORDER') {
      newCh.wordBank = [];
      newCh.correctOrder = [];
    } else if (type === 'COMPLETE') {
      newCh.sentence = 'He ___ a student.';
    } else if (type === 'MATCH') {
      newCh.pairs = [
        { left: '', right: '' },
        { left: '', right: '' },
      ];
    }

    setDraftLesson((prev) => ({
      ...prev,
      challenges: [...prev.challenges, newCh],
    }));
    toast.success(`Đã thêm 1 câu hỏi trống loại ${type}.`);
  };

  const handleSaveLesson = async () => {
    if (!draftLesson.title?.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài học.');
      return;
    }

    if (draftLesson.challenges.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 câu hỏi cho bài học.');
      return;
    }

    // Validate inputs locally before sending
    for (let i = 0; i < draftLesson.challenges.length; i++) {
      const ch = draftLesson.challenges[i];
      if (!ch.question?.trim()) {
        toast.error(`Câu số ${i + 1} chưa điền nội dung câu hỏi.`);
        return;
      }
      if (ch.type === 'ASSIST' || ch.type === 'FILL') {
        if (!ch.options || ch.options.length < 2) {
          toast.error(`Câu số ${i + 1} cần có ít nhất 2 lựa chọn đáp án.`);
          return;
        }
        const correctCount = ch.options.filter(o => o.correct).length;
        if (correctCount !== 1) {
          toast.error(`Câu số ${i + 1} phải có duy nhất 1 đáp án đúng được chọn.`);
          return;
        }
        const hasEmptyOption = ch.options.some(o => !o.text?.trim());
        if (hasEmptyOption) {
          toast.error(`Câu số ${i + 1} có lựa chọn chưa nhập nội dung.`);
          return;
        }
      }
      if (ch.type === 'FILL' && !ch.sentence?.includes('___')) {
        toast.error(`Cau so ${i + 1} can co cau dien khuyet chua ky hieu ___.`);
        return;
      }
      if (['TYPE', 'TRANSLATE', 'COMPLETE'].includes(ch.type) && !ch.correctAnswer?.trim()) {
        toast.error(`Cau so ${i + 1} chua dien dap an dung.`);
        return;
      }
      if (ch.type === 'COMPLETE' && !ch.sentence?.includes('___')) {
        toast.error(`Cau so ${i + 1} can co cau hoan thanh chua ky hieu ___.`);
        return;
      }
      if (ch.type === 'ORDER' && !ch.correctAnswer?.trim()) {
        toast.error(`Cau so ${i + 1} chua dien cau hoan chinh.`);
        return;
      }
      if (ch.type === 'MATCH') {
        const validPairs = (ch.pairs || []).filter(pair => pair.left?.trim() && pair.right?.trim());
        if (validPairs.length < 2) {
          toast.error(`Cau so ${i + 1} can co it nhat 2 cap ghep hop le.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        lesson: {
          title: draftLesson.title.trim(),
          subtitle: draftLesson.subtitle?.trim() || '',
          grammarFocus: draftLesson.grammarFocus,
          vocabFocus: draftLesson.vocabFocus,
          xpReward: 10,
          estimatedMinutes: 5,
          type: 'challenge',
        },
        challenges: draftLesson.challenges,
      };

      await teacherService.saveAiLesson(unitId, payload);
      toast.success('Đã lưu bài học AI thành công!');
      setDraftLesson(null);
      onSuccess();
      onHide();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Lưu bài học thất bại.';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardDraft = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy bỏ bản nháp bài học AI vừa tạo?')) {
      setDraftLesson(null);
      setErrorText('');
      setErrorCode(null);
    }
  };

  const isDraftMode = draftLesson !== null;

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        centered
        className="al-modal"
        dialogClassName={isDraftMode ? 'al-modal-dialog--draft' : 'al-modal-dialog--config'}
      >
        <Modal.Header closeButton className="al-header" disabled={generating || saving}>
          <Modal.Title className="al-title d-flex align-items-center gap-2">
            <FiCpu className="al-title-icon" />
            <span>{isDraftMode ? 'Xem trước Bài học nháp AI' : 'Thiết kế Bài học AI (Gemini Studio)'}</span>
            {isDraftMode && (
              <Badge bg="primary-subtle" className="al-badge-count ms-2">
                {draftLesson.challenges.length} câu hỏi
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="al-body">
          {/* Generating Loading Overlay */}
          {generating && (
            <div className="al-loading-overlay">
              <div className="al-loading-content">
                <Spinner animation="border" variant="primary" className="al-spinner mb-3" />
                <h5 className="al-loading-title">Đang biên soạn bài học...</h5>
                <p className="al-loading-text text-muted">{LOADING_MESSAGES[loadingMsgIndex]}</p>
              </div>
            </div>
          )}

          {/* STEP 1: CONFIGURE FORM */}
          {!isDraftMode && (
            <>
              {/* API Key Status Alert */}
              {!checkingKey && !hasKey && (
                <Alert variant="warning" className="al-key-alert d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <FiAlertTriangle className="text-warning flex-shrink-0" size={20} />
                    <div style={{ fontSize: '0.85rem' }}>
                      <span className="fw-semibold">Chưa cấu hình API Key!</span> Vui lòng thiết lập Gemini API Key cá nhân để sử dụng tính năng miễn phí.
                    </div>
                  </div>
                  <Button variant="warning" size="sm" onClick={() => setShowKeyModal(true)} className="d-flex align-items-center gap-1 al-btn-slim">
                    <FiSettings size={14} /> Cấu hình Key
                  </Button>
                </Alert>
              )}

              {/* Error logs */}
              {errorText && (
                <Alert variant="danger" className="mb-4">
                  <div className="d-flex align-items-center gap-2 fw-semibold text-danger-emphasis">
                    <FiAlertTriangle size={18} />
                    Gặp lỗi khi tạo bài học bằng AI
                  </div>
                  <p className="mb-2 mt-1 small">{errorText}</p>
                  {errorCode === 'KEY_MISSING' && (
                    <Button variant="outline-danger" size="sm" onClick={() => setShowKeyModal(true)} className="d-flex align-items-center gap-1 al-btn-slim">
                      <FiSettings size={14} /> Cấu hình Gemini Key
                    </Button>
                  )}
                </Alert>
              )}

              <Form onSubmit={handleGenerate}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Điểm ngữ pháp & Từ vựng chủ đề mong muốn *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ví dụ: Luyện thì hiện tại đơn với các hoạt động hàng ngày, Hoặc câu điều kiện loại 1..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="al-input-control"
                    disabled={generating}
                    maxLength={150}
                  />
                  <Form.Text className="text-muted text-xs">
                    Gemini sẽ soạn bài giảng ngắn, lọc ngữ pháp/từ vựng và tạo các câu hỏi trắc nghiệm, dịch thuật, điền khuyết thích hợp.
                  </Form.Text>
                </Form.Group>

                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">Trình độ bài tập mục tiêu</Form.Label>
                      <Form.Select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="al-input-control"
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
                      <Form.Label className="fw-semibold">Số lượng câu hỏi sinh ra ({count} câu)</Form.Label>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Range
                          min={5}
                          max={10}
                          step={1}
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                          disabled={generating}
                          className="flex-grow-1"
                        />
                        <Form.Control
                          type="number"
                          min={5}
                          max={10}
                          value={count}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 5 && val <= 10) setCount(val);
                          }}
                          style={{ width: '65px' }}
                          disabled={generating}
                        />
                      </div>
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Dạng câu hỏi muốn AI tạo *</Form.Label>
                  <div className="al-type-picker">
                    {AI_CHALLENGE_TYPES.map((type) => (
                      <label
                        key={type.id}
                        className={`al-type-option ${selectedChallengeTypes.includes(type.id) ? 'active' : ''}`}
                      >
                        <Form.Check
                          type="checkbox"
                          checked={selectedChallengeTypes.includes(type.id)}
                          onChange={() => handleToggleChallengeType(type.id)}
                          disabled={generating}
                        />
                        <span className="al-type-option-text">
                          <strong>{type.id}</strong>
                          <small>{type.label} - {type.desc}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <Form.Text className="text-muted text-xs">
                    SELECT không được AI tạo vì cần dữ liệu hình ảnh. Giáo viên vẫn có thể tạo SELECT thủ công trong Studio.
                  </Form.Text>
                </Form.Group>

                <div className="al-modal-footer">
                  <div className="d-flex align-items-center gap-1 text-muted cursor-pointer" onClick={() => setShowKeyModal(true)}>
                    <FiSettings size={14} />
                    <span style={{ fontSize: '0.8rem', textDecoration: 'underline' }}>Cài đặt API Key</span>
                  </div>
                  <div className="d-flex gap-2">
                    <Button variant="secondary" onClick={onHide} disabled={generating} className="al-btn-slim">
                      Đóng
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={generating || (!hasKey && !checkingKey)}
                      className="al-btn-slim"
                    >
                      <FiCpu /> Bắt đầu tạo bài học
                    </Button>
                  </div>
                </div>
              </Form>
            </>
          )}

          {/* STEP 2: PREVIEW DRAFT LESSON */}
          {isDraftMode && (
            <div className="al-draft-section">
              <Alert variant="info" className="py-2 px-3 mb-4 d-flex align-items-center gap-2">
                <FiBookOpen size={18} className="text-info flex-shrink-0" />
                <div className="small">
                  <strong>Chế độ biên duyệt bài giảng AI:</strong> Chỉnh sửa tiêu đề bài học và sửa đổi từng câu hỏi ở danh sách phía dưới trước khi lưu vào Chương học. Bài học mới sẽ mặc định khóa (chưa xuất bản công khai).
                </div>
              </Alert>

              <Card className="mb-4 shadow-sm border-light">
                <Card.Body>
                  <h6 className="text-primary fw-bold mb-3 d-flex align-items-center gap-1">
                    <FiActivity /> Thông tin tổng quan bài học
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-secondary">Tiêu đề bài học (Title) *</Form.Label>
                        <Form.Control
                          type="text"
                          value={draftLesson.title}
                          onChange={(e) => handleEditLessonMeta('title', e.target.value)}
                          placeholder="Nhập tiêu đề bài học"
                          className="form-control-sm"
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-secondary">Mô tả / Phụ đề (Subtitle)</Form.Label>
                        <Form.Control
                          type="text"
                          value={draftLesson.subtitle || ''}
                          onChange={(e) => handleEditLessonMeta('subtitle', e.target.value)}
                          placeholder="Mục tiêu hoặc bài giảng ngắn gọn"
                          className="form-control-sm"
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-secondary">Trọng tâm ngữ pháp (Phân tách bằng dấu phẩy)</Form.Label>
                        <Form.Control
                          type="text"
                          value={draftLesson.grammarFocus ? draftLesson.grammarFocus.join(', ') : ''}
                          onChange={(e) => handleEditLessonMeta('grammarFocus', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="e.g. Present Simple, Subject agreement"
                          className="form-control-sm"
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="small fw-semibold text-secondary">Trọng tâm từ vựng (Phân tách bằng dấu phẩy)</Form.Label>
                        <Form.Control
                          type="text"
                          value={draftLesson.vocabFocus ? draftLesson.vocabFocus.join(', ') : ''}
                          onChange={(e) => handleEditLessonMeta('vocabFocus', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="e.g. breakfast, wake up, routine"
                          className="form-control-sm"
                        />
                      </Form.Group>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Challenges list */}
              <h6 className="fw-bold mb-3 text-slate-800">Danh sách bài tập ({draftLesson.challenges.length})</h6>
              <div className="al-challenges-list mb-4">
                {draftLesson.challenges.map((ch, idx) => (
                  <div key={idx} className="al-challenge-item p-3 mb-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="dark" className="fs-6 py-1 px-2.5">
                          Câu {idx + 1}
                        </Badge>
                        <Badge bg="info" className="text-uppercase py-1.5 px-2 text-xs">
                          {getChallengeTypeLabel(ch.type)}
                        </Badge>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteChallenge(idx)}
                        className="py-1 px-2 d-flex align-items-center"
                        title="Xóa câu hỏi này"
                      >
                        <FiTrash2 size={13} />
                      </Button>
                    </div>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold text-secondary">Nội dung câu hỏi / Chỉ dẫn dịch *</Form.Label>
                      <Form.Control
                        type="text"
                        value={ch.question}
                        onChange={(e) => handleEditChallenge(idx, 'question', e.target.value)}
                        placeholder="Nội dung câu hỏi hiển thị cho học sinh..."
                      />
                    </Form.Group>

                    {/* ASSIST & FILL OPTIONS */}
                    {(ch.type === 'ASSIST' || ch.type === 'FILL') && (
                      <div className="al-options-editor border-start ps-3 mb-3">
                        <Form.Label className="small fw-semibold text-secondary d-flex justify-content-between align-items-center">
                          <span>Các phương án trả lời * (Tick chọn đáp án đúng duy nhất)</span>
                          <Button variant="link" size="sm" onClick={() => handleAddOption(idx)} className="p-0 text-decoration-none d-flex align-items-center gap-1">
                            <FiPlus size={13} /> Thêm phương án
                          </Button>
                        </Form.Label>

                        {ch.options.map((opt, oIdx) => (
                          <div key={oIdx} className="d-flex align-items-center gap-2 mb-2">
                            <Form.Check
                              type="radio"
                              name={`ch-correct-${idx}`}
                              checked={opt.correct}
                              onChange={() => handleEditOption(idx, oIdx, 'correct', true)}
                              style={{ transform: 'scale(1.15)', cursor: 'pointer' }}
                            />
                            <Form.Control
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleEditOption(idx, oIdx, 'text', e.target.value)}
                              placeholder={`Lựa chọn ${oIdx + 1}`}
                              className="form-control-sm"
                            />
                            {ch.options.length > 2 && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => handleDeleteOption(idx, oIdx)}
                                className="py-0 px-2 d-flex align-items-center"
                                style={{ height: '30px' }}
                              >
                                <FiX size={12} />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FILL SPECIFIC: SENTENCE SENTINEL */}
                    {ch.type === 'FILL' && (
                      <Form.Group className="mb-3 border-start ps-3">
                        <Form.Label className="small fw-semibold text-secondary">Câu chứa ô trống (sử dụng 3 dấu gạch dưới \`___\` để đánh dấu) *</Form.Label>
                        <Form.Control
                          type="text"
                          value={ch.sentence || ''}
                          onChange={(e) => handleEditChallenge(idx, 'sentence', e.target.value)}
                          placeholder="e.g. He ___ a good teacher."
                          className="form-control-sm"
                        />
                      </Form.Group>
                    )}

                    {/* TYPE SPECIFIC: TYPED ANSWER */}
                    {ch.type === 'TYPE' && (
                      <Form.Group className="mb-3 border-start ps-3">
                        <Form.Label className="small fw-semibold text-secondary">Đáp án đúng để học viên gõ *</Form.Label>
                        <Form.Control
                          type="text"
                          value={ch.correctAnswer || ''}
                          onChange={(e) => handleEditChallenge(idx, 'correctAnswer', e.target.value)}
                          placeholder="e.g. Good morning"
                          className="form-control-sm"
                        />
                      </Form.Group>
                    )}

                    {/* COMPLETE SPECIFIC: SENTENCE + TYPED ANSWER */}
                    {ch.type === 'COMPLETE' && (
                      <div className="border-start ps-3 mb-3">
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-semibold text-secondary">Câu chứa ô trống ___ *</Form.Label>
                          <Form.Control
                            type="text"
                            value={ch.sentence || ''}
                            onChange={(e) => handleEditChallenge(idx, 'sentence', e.target.value)}
                            placeholder="e.g. She ___ a student."
                            className="form-control-sm"
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-secondary">Đáp án đúng để điền *</Form.Label>
                          <Form.Control
                            type="text"
                            value={ch.correctAnswer || ''}
                            onChange={(e) => handleEditChallenge(idx, 'correctAnswer', e.target.value)}
                            placeholder="e.g. is"
                            className="form-control-sm"
                          />
                        </Form.Group>
                      </div>
                    )}

                    {/* ORDER SPECIFIC: CORRECT ANSWER SENTENCE */}
                    {ch.type === 'ORDER' && (
                      <div className="border-start ps-3 mb-3">
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-semibold text-secondary">Câu đúng hoàn chỉnh * (Cách từ bằng dấu cách để tự tạo kho từ xáo trộn)</Form.Label>
                          <Form.Control
                            type="text"
                            value={ch.correctAnswer}
                            onChange={(e) => handleEditChallenge(idx, 'correctAnswer', e.target.value)}
                            placeholder="e.g. I wake up at six AM"
                            className="form-control-sm"
                          />
                        </Form.Group>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          <strong>Kho từ xáo trộn (Word Bank):</strong> {ch.wordBank ? ch.wordBank.map((w, idx) => (
                            <Badge key={idx} bg="secondary" className="me-1">{w}</Badge>
                          )) : <em>Trống</em>}
                        </div>
                      </div>
                    )}

                    {/* MATCH SPECIFIC: PAIRS */}
                    {ch.type === 'MATCH' && (
                      <Form.Group className="mb-3 border-start ps-3">
                        <Form.Label className="small fw-semibold text-secondary">Các cặp ghép (mỗi dòng: trái | phải) *</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={stringifyPairs(ch.pairs)}
                          onChange={(e) => handleEditChallenge(idx, 'pairs', parsePairsText(e.target.value))}
                          placeholder={'hello | xin chào\nthank you | cảm ơn'}
                          className="form-control-sm"
                        />
                      </Form.Group>
                    )}

                    {/* TRANSLATE SPECIFIC: TRANSLATION ANSWER */}
                    {ch.type === 'TRANSLATE' && (
                      <div className="border-start ps-3 mb-3">
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-semibold text-secondary">Đáp án dịch đúng chính xác *</Form.Label>
                          <Form.Control
                            type="text"
                            value={ch.correctAnswer}
                            onChange={(e) => handleEditChallenge(idx, 'correctAnswer', e.target.value)}
                            placeholder="Nhập câu dịch tiếng Anh hoặc tiếng Việt chuẩn..."
                            className="form-control-sm"
                          />
                        </Form.Group>
                        <div className="row g-2">
                          <div className="col-6">
                            <Form.Group>
                              <Form.Label className="text-xs text-secondary mb-0">Ngôn ngữ nguồn</Form.Label>
                              <Form.Select
                                value={ch.sourceLang || 'vi'}
                                onChange={(e) => handleEditChallenge(idx, 'sourceLang', e.target.value)}
                                className="form-select-sm"
                              >
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">Tiếng Anh</option>
                              </Form.Select>
                            </Form.Group>
                          </div>
                          <div className="col-6">
                            <Form.Group>
                              <Form.Label className="text-xs text-secondary mb-0">Ngôn ngữ dịch ra</Form.Label>
                              <Form.Select
                                value={ch.targetLang || 'en'}
                                onChange={(e) => handleEditChallenge(idx, 'targetLang', e.target.value)}
                                className="form-select-sm"
                              >
                                <option value="en">Tiếng Anh</option>
                                <option value="vi">Tiếng Việt</option>
                              </Form.Select>
                            </Form.Group>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add blank challenge panel */}
              <div className="al-add-challenge-container">
                <span className="al-add-challenge-title">Thêm câu hỏi mới thủ công:</span>
                <div className="al-add-challenge-buttons">
                  {AI_CHALLENGE_TYPES.map((type) => (
                    <Button
                      key={type.id}
                      variant="outline-primary"
                      className="al-btn-slim al-btn-add"
                      onClick={() => handleAddChallenge(type.id)}
                    >
                      + {type.label} ({type.id})
                    </Button>
                  ))}
                </div>
              </div>

              {/* Footer actions for draft mode */}
              <div className="al-modal-footer">
                <div className="d-flex gap-2">
                  <Button variant="outline-danger" onClick={handleDiscardDraft} disabled={saving} className="al-btn-slim">
                    Hủy bản nháp
                  </Button>
                </div>
                <div className="d-flex gap-2">
                  <Button variant="primary" onClick={handleSaveLesson} disabled={saving} className="al-btn-slim">
                    {saving ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-1" />
                        Đang lưu bài học...
                      </>
                    ) : (
                      <>
                        <FiSave /> Lưu bài học vào Unit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <GeminiKeyModal
        show={showKeyModal}
        onHide={() => {
          setShowKeyModal(false);
          checkKeyStatus();
        }}
      />
    </>
  );
}
