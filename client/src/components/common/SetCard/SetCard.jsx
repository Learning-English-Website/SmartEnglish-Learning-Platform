import { Edit, Trash2 } from 'lucide-react';
import './SetCard.css';

export default function SetCard({ set, showActions = false, onEdit, onDelete, onClick }) {
  const cardCount = set.cards?.length ?? set.cardCount ?? 0;
  const username = set.user?.username || 'smart_learner';
  const userInitial = username.charAt(0).toUpperCase();

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
