import { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { FiCopy, FiCheck, FiShare2, FiGlobe, FiLock } from 'react-icons/fi';
import { setService } from '../../../api/setService';
import { toast } from 'react-hot-toast';
import './ShareModal.css';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

/**
 * ShareModal — copy shareable link for a public flashcard set
 *
 * @param {boolean} show - Whether modal is visible
 * @param {string} setId - ID of the set to share
 * @param {string} setTitle - Title of the set (for display)
 * @param {boolean} isPublic - Whether the set is already public
 * @param {function} onHide - Callback to close modal
 * @param {function} onPublicChanged - Callback when visibility changes
 */
export default function ShareModal({ show, setId, setTitle, isPublic, onHide, onPublicChanged }) {
  const [copied, setCopied] = useState(false);
  const [copiedDeepLink, setCopiedDeepLink] = useState(false);
  const [currentIsPublic, setCurrentIsPublic] = useState(isPublic);
  const [makingPublic, setMakingPublic] = useState(false);

  useEffect(() => {
    setCurrentIsPublic(isPublic);
  }, [isPublic]);

  useEffect(() => {
    if (!show) {
      setCopied(false);
      setCopiedDeepLink(false);
    }
  }, [show]);

  const shareUrl = `${APP_URL}/flashcards/sets/${setId}`;
  const deepLinkUrl = `smartenglish://set/${setId}`;

  const handleMakePublic = async () => {
    setMakingPublic(true);
    try {
      await setService.update(setId, { isPublic: true });
      setCurrentIsPublic(true);
      toast.success('Học phần hiện đã được công khai! Bất kỳ ai cũng có thể xem.');
      onPublicChanged?.(true);
    } catch (err) {
      toast.error('Không thể công khai học phần này');
    } finally {
      setMakingPublic(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Đã sao chép liên kết vào bộ nhớ tạm!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLinkUrl);
      setCopiedDeepLink(true);
      toast.success('Đã sao chép Mobile deep link!');
      setTimeout(() => setCopiedDeepLink(false), 2000);
    } catch {
      toast.error('Không thể sao chép deep link');
    }
  };

  const handleClose = () => {
    setCopied(false);
    setCopiedDeepLink(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="share-modal">
      <Modal.Header closeButton className="share-modal-header">
        <Modal.Title>
          <FiShare2 className="me-2" />
          Chia sẻ "{setTitle || 'Học phần'}"
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="share-modal-body">
        {!currentIsPublic ? (
          <div className="share-generate-section">
            <div className="share-icon-wrap">
              <FiLock size={48} />
            </div>
            <h4>Học phần này đang ở chế độ riêng tư</h4>
            <p>
              Để chia sẻ học phần này, trước tiên bạn cần công khai nó. Chỉ khi đó người khác mới có thể xem và học.
            </p>
            <Button
              variant="primary"
              onClick={handleMakePublic}
              disabled={makingPublic}
              className="share-generate-btn"
            >
              {makingPublic ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang công khai...
                </>
              ) : (
                <>
                  <FiGlobe className="me-2" />
                  Công khai
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="share-link-section">
            <p className="share-link-label">Chia sẻ học phần công khai này (Web)</p>

            <InputGroup className="share-link-input-group mb-3">
              <Form.Control
                type="text"
                value={shareUrl}
                readOnly
                className="share-link-input"
              />
              <Button
                variant={copied ? 'success' : 'outline-secondary'}
                onClick={handleCopy}
                className="share-copy-btn"
              >
                {copied ? (
                  <>
                    <FiCheck className="me-1" /> Đã chép
                  </>
                ) : (
                  <>
                    <FiCopy className="me-1" /> Sao chép
                  </>
                )}
              </Button>
            </InputGroup>

            <p className="share-link-label">Mở trong Ứng dụng Di động (Deep Link)</p>

            <InputGroup className="share-link-input-group">
              <Form.Control
                type="text"
                value={deepLinkUrl}
                readOnly
                className="share-link-input"
              />
              <Button
                variant={copiedDeepLink ? 'success' : 'outline-secondary'}
                onClick={handleCopyDeepLink}
                className="share-copy-btn"
              >
                {copiedDeepLink ? (
                  <>
                    <FiCheck className="me-1" /> Đã chép
                  </>
                ) : (
                  <>
                    <FiCopy className="me-1" /> Sao chép
                  </>
                )}
              </Button>
            </InputGroup>

            <div className="share-info mt-3">
              <small>Bất kỳ ai có liên kết này đều có thể xem và học học phần này.</small>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="share-modal-footer">
        <Button variant="secondary" onClick={handleClose}>
          {currentIsPublic ? 'Hoàn tất' : 'Hủy'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
