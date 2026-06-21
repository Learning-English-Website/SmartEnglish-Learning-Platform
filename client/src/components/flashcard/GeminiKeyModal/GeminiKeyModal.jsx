import { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Alert, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FiKey, FiEye, FiEyeOff, FiCheckCircle, FiAlertTriangle, FiInfo, FiExternalLink, FiTrash2 } from 'react-icons/fi';
import { aiService } from '../../../api/aiService';
import { toast } from 'react-hot-toast';
import './GeminiKeyModal.css';

/**
 * GeminiKeyModal — Component to manage Gemini API Key configuration
 *
 * @param {boolean} show - Whether modal is visible
 * @param {function} onHide - Callback to close modal
 * @param {function} onKeyStatusChange - Callback when key is updated/cleared (optional)
 */
export default function GeminiKeyModal({ show, onHide, onKeyStatusChange }) {
  const [hasKey, setHasKey] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [validationResult, setValidationResult] = useState(null); // { success: boolean, message: string }

  // Check key status on mount / show
  useEffect(() => {
    if (show) {
      checkKeyStatus();
      // Reset form states
      setApiKey('');
      setValidationResult(null);
    }
  }, [show]);

  const checkKeyStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await aiService.getAiKeyStatus();
      // Response shape is { success: true, data: { hasGeminiKey: boolean } }
      const statusData = res?.data ?? res;
      setHasKey(!!statusData.hasGeminiKey);
      if (onKeyStatusChange) {
        onKeyStatusChange(!!statusData.hasGeminiKey);
      }
    } catch (err) {
      setHasKey(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      toast.error('Vui lòng nhập API Key');
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await aiService.validateKey(apiKey.trim());
      // Response shape: { success: true, data: { valid: boolean, message?: string } }
      const resultData = res?.data ?? res;
      if (resultData.success) {
        setValidationResult({
          success: true,
          message: resultData.message || 'Kết nối thành công! Gemini API Key này hợp lệ và sẵn sàng hoạt động.',
        });
        toast.success('Xác thực API Key thành công!');
      } else {
        setValidationResult({
          success: false,
          message: resultData.message || 'API Key không hợp lệ hoặc không kết nối được.',
        });
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra API Key.';
      setValidationResult({
        success: false,
        message: errorMsg,
      });
      toast.error('Xác thực API Key thất bại.');
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('Vui lòng nhập API Key trước khi lưu');
      return;
    }

    setSaving(true);
    try {
      await aiService.setKey(apiKey.trim(), rememberMe);
      toast.success('Đã lưu cấu hình Gemini API Key!');
      setHasKey(true);
      setApiKey('');
      setValidationResult(null);
      if (onKeyStatusChange) {
        onKeyStatusChange(true);
      }
      onHide();
    } catch (err) {
      const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Không thể lưu API Key.';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Gemini API Key khỏi thiết bị này?')) {
      return;
    }
    setDeleting(true);
    try {
      await aiService.clearKey();
      toast.success('Đã xóa Gemini API Key thành công.');
      setHasKey(false);
      setValidationResult(null);
      if (onKeyStatusChange) {
        onKeyStatusChange(false);
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xóa API Key.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="gkm-modal">
      <Modal.Header closeButton className="gkm-header">
        <Modal.Title className="gkm-title">
          <FiKey className="gkm-title-icon" /> Cấu hình Gemini API Key
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="gkm-body">
        {/* Status indicator */}
        <div className="gkm-status-banner mb-4">
          <span className="gkm-status-label">Trạng thái hiện tại:</span>
          {checkingStatus ? (
            <Spinner animation="border" size="sm" className="ms-2" />
          ) : hasKey ? (
            <div className="d-inline-flex align-items-center gap-2">
              <Badge bg="success" className="gkm-badge py-2 px-3">
                <FiCheckCircle size={14} className="me-1" /> Đã kết nối Key cá nhân
              </Badge>
              <Button
                variant="outline-danger"
                size="sm"
                className="gkm-delete-btn py-1 px-2 d-flex align-items-center gap-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Spinner animation="border" size="sm" /> : <FiTrash2 size={13} />}
                Xóa Key
              </Button>
            </div>
          ) : (
            <Badge bg="secondary" className="gkm-badge py-2 px-3">
              <FiAlertTriangle size={14} className="me-1" /> Chưa cấu hình Key
            </Badge>
          )}
        </div>

        {/* Input form */}
        <Form onSubmit={handleSave} className="mt-3">
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold d-flex align-items-center gap-1">
              Google Gemini API Key mới
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id="byok-tooltip">
                    <strong>Mô hình Bring Your Own Key (BYOK)</strong>
                    <br />
                    API Key của bạn sẽ được mã hóa đối xứng (AES-256-GCM) và chỉ lưu trong cookie đã ký (signed HttpOnly) trên trình duyệt, không bao giờ lưu vào Database và không lộ ra mã nguồn Javascript.
                  </Tooltip>
                }
              >
                <span className="text-info d-inline-flex align-items-center" style={{ cursor: 'pointer' }}>
                  <FiInfo size={14} />
                </span>
              </OverlayTrigger>
            </Form.Label>
            <InputGroup>
              <InputGroup.Text className="gkm-input-icon-wrapper">
                <FiKey />
              </InputGroup.Text>
              <Form.Control
                type={showKey ? 'text' : 'password'}
                placeholder="Nhập API Key (Bắt đầu bằng AIzaSy... hoặc key hợp lệ)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="gkm-input"
                disabled={saving || validating}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowKey(!showKey)}
                className="gkm-toggle-visibility-btn"
                disabled={saving || validating}
              >
                {showKey ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </Button>
            </InputGroup>
            <Form.Text className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
              Ví dụ định dạng API Key: AIzaSyD...
            </Form.Text>
            <Form.Text className="d-block mt-2" style={{ fontSize: '0.8rem' }}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="gkm-link d-inline-flex align-items-center gap-1 fw-semibold text-primary"
              >
                Lấy Gemini API Key miễn phí tại Google AI Studio <FiExternalLink size={12} />
              </a>
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              id="remember-me-checkbox"
              label="Duy trì đăng nhập Key trong 7 ngày (Sử dụng cookie 7 ngày thay vì cookie phiên)"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="gkm-checkbox"
              disabled={saving || validating}
            />
          </Form.Group>

          {/* Validation Result Alert */}
          {validationResult && (
            <Alert
              variant={validationResult.success ? 'success' : 'danger'}
              className="gkm-validation-alert mb-4"
            >
              <div className="d-flex align-items-center gap-2 fw-semibold">
                {validationResult.success ? <FiCheckCircle size={16} /> : <FiAlertTriangle size={16} />}
                {validationResult.success ? 'Hợp lệ' : 'Lỗi kết nối'}
              </div>
              <p className="mb-0 mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
                {validationResult.message}
              </p>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" onClick={onHide} disabled={saving || validating}>
              Hủy
            </Button>
            <Button
              variant="outline-primary"
              onClick={handleValidate}
              disabled={validating || saving || !apiKey.trim()}
              className="d-flex align-items-center gap-1"
            >
              {validating && <Spinner animation="border" size="sm" />}
              Kiểm tra kết nối
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || validating || !apiKey.trim()}
              className="d-flex align-items-center gap-1"
            >
              {saving && <Spinner animation="border" size="sm" />}
              Lưu cấu hình
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
