import { Edit, Trash2 } from 'lucide-react';
import './SetCard.css';

export default function SetCard({ set, showActions = false, onEdit, onDelete, onClick }) {
  const cardCount = set.cards?.length ?? set.cardCount ?? 0;
  const username = set.user?.username || 'smart_learner';
  const userInitial = username.charAt(0).toUpperCase();

  // Safely extract populated tag objects
  const tagsToRender = set.tagObjects || (Array.isArray(set.tags) && set.tags.length > 0 && typeof set.tags[0] === 'object' ? set.tags : []);

  return (
    <div className="set-card-v2" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Visual stacked card deck shadows */}
      <div className="deck-shadow-layer layer-2"></div>
      <div className="deck-shadow-layer layer-1"></div>

      <div className="set-card-content">
        <div className="set-card-header">
          <span className="term-badge">{cardCount} thuật ngữ</span>
          {showActions && (
            <div className="set-card-actions">
              <button 
                className="action-btn edit-btn" 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                title="Sửa"
                aria-label="Sửa học phần"
              >
                <Edit size={13} />
              </button>
              <button 
                className="action-btn delete-btn" 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                title="Xóa"
                aria-label="Xóa học phần"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        <h3 className="set-card-title">{set.title}</h3>

        {tagsToRender.length > 0 && (
          <div className="set-card-tags">
            {tagsToRender.map(t => (
              <span 
                key={t._id} 
                className="set-card-tag-pill"
                style={{
                  color: t.color || 'var(--gl-tertiary)',
                  backgroundColor: t.color ? `${t.color}10` : 'rgba(44, 94, 245, 0.06)',
                  borderColor: t.color ? `${t.color}25` : 'rgba(44, 94, 245, 0.12)'
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="set-card-footer">
          <div className="user-profile">
            <div className="avatar-circle">{userInitial}</div>
            <span className="username-text">{username}</span>
          </div>
          <span className="arrow-indicator">➔</span>
        </div>
      </div>
    </div>
  );
}
