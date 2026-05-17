import { motion } from 'framer-motion';

/**
 * StudyProgress - Animated progress bar for study modes
 * @param {number} current - Current step (1-based)
 * @param {number} total - Total steps
 * @param {number} correct - Number of correct answers (optional)
 * @param {string} label - Optional label above progress
 */

export default function StudyProgress({ current, total, correct, label }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="study-progress">
      {label && <span className="study-progress__label">{label}</span>}
      <div className="study-progress__track">
        <motion.div
          className="study-progress__fill"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <div className="study-progress__meta">
        <span className="study-progress__count">{current} / {total}</span>
        {correct !== undefined && (
          <span className="study-progress__correct">{correct} đúng</span>
        )}
      </div>

      <style>{`
        .study-progress {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .study-progress__label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #8a8fa8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .study-progress__track {
          height: 8px;
          background: #e8eaf0;
          border-radius: 4px;
          overflow: hidden;
        }

        [data-theme='dark'] .study-progress__track {
          background: rgba(255, 255, 255, 0.1);
        }

        .study-progress__fill {
          height: 100%;
          background: linear-gradient(90deg, #2c5ef5, #6b8cff);
          border-radius: 4px;
        }

        .study-progress__meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .study-progress__count {
          font-size: 0.8rem;
          font-weight: 600;
          color: #4a5568;
          font-variant-numeric: tabular-nums;
        }

        [data-theme='dark'] .study-progress__count {
          color: #868e96;
        }

        .study-progress__correct {
          font-size: 0.8rem;
          font-weight: 600;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}
