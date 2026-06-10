import { Edit, Trash2, BookOpen } from 'lucide-react';
import './SetCard.css';

export default function SetCard({ set, showActions = false, onEdit, onDelete, onClick }) {
  const cardCount = set.cards?.length ?? set.cardCount ?? 0;

  return (
    <div className="set-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="set-card__body">
        <h3 className="set-card__title">{set.title}</h3>
        <p className="set-card__desc">{set.description || 'Không có mô tả'}</p>
      </div>
      <div className="set-card__footer">
        <span className="set-card__stats">
          <BookOpen size={14} />
          {cardCount} thẻ
        </span>
        {showActions && (
          <div className="set-card__actions">
            <button className="set-card__btn set-card__btn--edit" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Sửa">
              <Edit size={14} />
            </button>
            <button className="set-card__btn set-card__btn--delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Xóa">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
