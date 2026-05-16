import { useNavigate } from 'react-router-dom';
import {
  FiEdit2,
  FiTrash2,
  FiLayers,
  FiGlobe,
  FiLock,
  FiCalendar,
  FiBookmark,
  FiPlus,
  FiChevronRight,
} from 'react-icons/fi';
import './SetCard.css';

/**
 * SetCard — displays a FlashcardSet as a horizontal list item.
 */
export default function SetCard({ set, onEdit, onDelete, showActions = true, linkUrl, isBookmarked = false, onToggleBookmark }) {
  const navigate = useNavigate();

  const formattedDate = set.createdAt
    ? new Date(set.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const creator = set.user;
  const creatorName = creator?.username || 'Unknown';
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  const handleCardClick = (e) => {
    if (e.target.closest('.set-card-actions')) return;
    navigate(linkUrl || `/flashcards/sets/${set._id}`);
  };

  return (
    <div
      className="set-card set-card--list"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(e); }}
    >
      {/* Left accent bar */}
      <div className="set-card-accent" />

      {/* Main content */}
      <div className="set-card-content">
        <div className="set-card-left">
          {/* Creator info */}
          <div className="set-card-creator">
            <div className="set-card-avatar">
              {creator?.avatar ? (
                <img src={creator.avatar} alt={creatorName} />
              ) : (
                creatorInitial
              )}
            </div>
            <span className="set-card-username">{creatorName}</span>
          </div>

          <h3 className="set-card-title">{set.title}</h3>
          {set.description && (
            <p className="set-card-desc">{set.description}</p>
          )}
          <div className="set-card-meta">
            <span className="set-card-meta-item">
              <FiLayers size={13} />
              <strong>{set.cardCount ?? 0}</strong> thuật ngữ
            </span>
            {formattedDate && (
              <span className="set-card-meta-item">
                <FiCalendar size={13} />
                {formattedDate}
              </span>
            )}
          </div>
        </div>

        <div className="set-card-right">
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

          {/* Visibility */}
          <span className={`set-card-visibility ${set.isPublic ? 'public' : 'private'}`}>
            {set.isPublic ? <FiGlobe size={10} /> : <FiLock size={10} />}
            {set.isPublic ? 'Công khai' : 'Riêng tư'}
          </span>

          {/* Actions */}
          {showActions && (
            <div className="set-card-actions">
              {onToggleBookmark && (
                <button
                  className={`set-card-btn set-card-btn--bookmark ${isBookmarked ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleBookmark?.(); }}
                  title={isBookmarked ? 'Bỏ lưu' : 'Lưu'}
                >
                  {isBookmarked ? <FiBookmark size={14} /> : <FiPlus size={14} />}
                </button>
              )}
              <button
                className="set-card-btn set-card-btn--edit"
                onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                title="Chỉnh sửa"
              >
                <FiEdit2 size={14} />
              </button>
              <button
                className="set-card-btn set-card-btn--delete"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                title="Xóa"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          )}

          <FiChevronRight size={18} className="set-card-arrow" />
        </div>
      </div>
    </div>
  );
}
