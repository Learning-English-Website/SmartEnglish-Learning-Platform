import { Edit, Trash2 } from 'lucide-react';
import './SetCard.css';

export default function SetCard({ set, showActions = false, onEdit, onDelete, onClick }) {
  const cardCount = set.cards?.length ?? set.cardCount ?? 0;
  const username = set.user?.username || 'smart_learner';
  const userInitial = username.charAt(0).toUpperCase();

  return (
    <div className="set-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="set-card__main">
        <div className="set-card__header-row">
          <span className="set-card__count">{cardCount} thuật ngữ</span>
          <span className="set-card__separator">|</span>
          <div className="set-card__user-info">
            <div className="set-card__avatar">{userInitial}</div>
            <span className="set-card__username">{username}</span>
          </div>
        </div>
        <h3 className="set-card__title">{set.title}</h3>
      </div>
      {showActions && (
        <div className="set-card__actions">
          <button className="set-card__btn set-card__btn--edit" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Sửa">
            <Edit size={16} />
          </button>
          <button className="set-card__btn set-card__btn--delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Xóa">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
