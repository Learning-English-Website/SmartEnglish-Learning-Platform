import { useNavigate } from 'react-router-dom';
import {
  FiEdit2,
  FiTrash2,
  FiLayers,
  FiGlobe,
  FiLock,
  FiCalendar,
} from 'react-icons/fi';
import './SetCard.css';

/**
 * SetCard — displays a FlashcardSet in the MySets grid.
 *
 * @param {{ set: FlashcardSet, onEdit?: fn, onDelete?: fn, showActions?: boolean }} props
 */
export default function SetCard({ set, onEdit, onDelete, showActions = true }) {
  const navigate = useNavigate();

  const formattedDate = set.createdAt
    ? new Date(set.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const handleCardClick = (e) => {
    // Don't navigate if user clicked action buttons
    if (e.target.closest('.set-card-actions')) return;
    navigate(`/flashcards/sets/${set._id}`);
  };

  return (
    <div
      className="set-card surface-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(e); }}
    >
      {/* Header */}
      <div className="set-card-header">
        <div className="set-card-title-row">
          <h3 className="set-card-title">{set.title}</h3>
          <span className={`set-card-visibility ${set.isPublic ? 'public' : 'private'}`}>
            {set.isPublic ? <FiGlobe size={12} /> : <FiLock size={12} />}
            {set.isPublic ? 'Public' : 'Private'}
          </span>
        </div>
        {set.description && (
          <p className="set-card-desc">{set.description}</p>
        )}
      </div>

      {/* Tags */}
      {set.tags && set.tags.length > 0 && (
        <div className="set-card-tags">
          {set.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="set-card-tag">{tag}</span>
          ))}
          {set.tags.length > 3 && (
            <span className="set-card-tag set-card-tag--more">
              +{set.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="set-card-footer">
        <div className="set-card-meta">
          <span className="set-card-meta-item">
            <FiLayers size={13} />
            <strong>{set.cardCount ?? 0}</strong> cards
          </span>
          {formattedDate && (
            <span className="set-card-meta-item">
              <FiCalendar size={13} />
              {formattedDate}
            </span>
          )}
          {set.language && (
            <span className="set-card-meta-item set-card-lang">
              {set.language}
            </span>
          )}
        </div>

        {showActions && (
          <div className="set-card-actions">
            <button
              className="set-card-btn set-card-btn--edit"
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              title="Edit set"
              aria-label="Edit set"
              id={`edit-set-${set._id}`}
            >
              <FiEdit2 size={14} />
            </button>
            <button
              className="set-card-btn set-card-btn--delete"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              title="Delete set"
              aria-label="Delete set"
              id={`delete-set-${set._id}`}
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
