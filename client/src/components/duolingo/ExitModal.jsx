import { memo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './ExitModal.css';

const ExitModal = memo(function ExitModal({ isOpen, onClose, onContinue }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
    >
      <motion.div
        className="modal-content exit-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mascot-container">
          <span className="mascot-sad" role="img" aria-label="Sad face">😟</span>
        </div>

        <h2 id="exit-modal-title">Wait, don't go!</h2>
        <p className="modal-subtitle">You haven't finished this lesson yet.</p>
        <p className="modal-message">Are you sure you want to leave?</p>

        <div className="modal-actions">
          <button className="btn-continue" onClick={onContinue}>
            Keep Going
          </button>
          <button className="btn-exit" onClick={onClose}>
            Exit Lesson
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default ExitModal;
