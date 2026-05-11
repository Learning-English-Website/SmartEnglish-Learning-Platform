import { Modal as BsModal, Button } from 'react-bootstrap';
import { useEffect } from 'react';

export default function Modal({
  show,
  onHide,
  title,
  children,
  footer,
  size = 'md',
  centered = true,
  closeButton = true,
  className = '',
}) {
  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  return (
    <BsModal
      show={show}
      onHide={onHide}
      centered={centered}
      size={size}
      className={className}
      onExit={onHide}
    >
      <BsModal.Header closeButton={closeButton} className="custom-modal-header">
        {title && <BsModal.Title className="custom-modal-title">{title}</BsModal.Title>}
      </BsModal.Header>
      <BsModal.Body className="custom-modal-body">{children}</BsModal.Body>
      {footer && <BsModal.Footer className="custom-modal-footer">{footer}</BsModal.Footer>}
    </BsModal>
  );
}

export function ConfirmModal({ show, onHide, onConfirm, title = 'Confirm', message, confirmText = 'Confirm', confirmVariant = 'danger', loading = false }) {
  return (
    <Modal show={show} onHide={onHide} title={title} size="sm" footer={
      <>
        <Button variant="outline-secondary" onClick={onHide} disabled={loading}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
          {loading ? <span className="spinner-border spinner-border-sm" /> : confirmText}
        </Button>
      </>
    }>
      <p style={{ margin: 0, color: 'var(--text-body)' }}>{message}</p>
    </Modal>
  );
}
