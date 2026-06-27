import { memo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './HeartsModal.css';

const HeartsModal = memo(function HeartsModal({ isOpen, onClose, onRefill, onPractice, error, isLoading }) {
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
      aria-labelledby="hearts-modal-title"
      aria-describedby="hearts-modal-desc"
    >
      <motion.div
        className="modal-content hearts-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mascot-container">
          <span className="mascot-broken" role="img" aria-label="Broken heart">💔</span>
        </div>

        <h2 id="hearts-modal-title">Out of Hearts!</h2>
        <p id="hearts-modal-desc" className="modal-subtitle">
          You ran out of hearts. You can't start new lessons without hearts.
        </p>

        {error && (
          <div className="refill-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="hearts-options">
          <button
            className="btn-refill"
            onClick={onRefill}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            <span className="btn-icon">🩷</span>
            <span>{isLoading ? 'Refilling...' : 'Refill Hearts'}</span>
            <span className="btn-cost">(300 XP)</span>
          </button>

          <button className="btn-pro" onClick={onPractice}>
            <span className="btn-icon">📚</span>
            <span>Practice Lessons</span>
            <span className="btn-cost">Earn hearts</span>
          </button>
        </div>

        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </motion.div>
    </motion.div>
  );
});

export default HeartsModal;
