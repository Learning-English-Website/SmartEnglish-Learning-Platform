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
 */
export default function SetCard({ set, onEdit, onDelete, showActions = true, linkUrl }) {
  const navigate = useNavigate();

  const formattedDate = set.createdAt
    ? new Date(set.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleCardClick = (e) => {
    if (e.target.closest('.set-card-actions')) return;
    navigate(linkUrl || `/flashcards/sets/${set._id}`);
  };

  return (
    <div
      className="set-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(e); }}
    >
      <div className="set-card-inner">
        {/* Header */}
        <div className="set-card-header">
          <div className="set-card-title-row">
            <h3 className="set-card-title">{set.title}</h3>
            <span className={`set-card-visibility ${set.isPublic ? 'public' : 'private'}`}>
              {set.isPublic ? <FiGlobe size={11} /> : <FiLock size={11} />}
              {set.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
          {set.description && (
            <p className="set-card-desc">{set.description}</p>
          )}
        </div>

        {/* Tags */}
        {set.tagObjects && set.tagObjects.length > 0 && (
          <div className="set-card-tags">
            {set.tagObjects.slice(0, 3).map((tag) => (
              <span key={tag._id} className="set-card-tag">{tag.name}</span>
            ))}
            {set.tagObjects.length > 3 && (
              <span className="set-card-tag set-card-tag--more">+{set.tagObjects.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="set-card-footer">
          <div className="set-card-meta">
            <span className="set-card-meta-item">
              <FiLayers size={14} />
              <strong>{set.cardCount ?? 0}</strong> cards
            </span>
            {formattedDate && (
              <span className="set-card-meta-item">
                <FiCalendar size={14} />
                {formattedDate}
              </span>
            )}
          </div>

          {showActions && (
            <div className="set-card-actions">
              <button
                className="set-card-btn set-card-btn--edit"
                onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                title="Edit set"
              >
                <FiEdit2 size={14} />
              </button>
              <button
                className="set-card-btn set-card-btn--delete"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                title="Delete set"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
