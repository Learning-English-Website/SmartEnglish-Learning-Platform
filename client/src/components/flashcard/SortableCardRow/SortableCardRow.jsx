import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiEdit2, FiTrash2, FiMenu } from 'react-icons/fi';
import './SortableCardRow.css';

/**
 * SortableCardRow — a drag-and-droppable card row in SetDetail list view.
 *
 * Props:
 *   card       — Flashcard object
 *   index      — display index (1-based)
 *   onEdit()   — called to start editing
 *   onDelete() — called to delete
 */
export default function SortableCardRow({ card, index, onEdit, onDelete, readonly = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.4 : 1,
    zIndex:    isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={readonly ? null : setNodeRef}
      style={style}
      className={`scr-row surface-card ${isDragging ? 'scr-dragging' : ''} ${readonly ? 'scr-readonly' : ''}`}
    >
      {/* Drag handle */}
      {!readonly && (
        <button
          className="scr-drag-handle"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          <FiMenu size={15} />
        </button>
      )}

      {/* Index */}
      <span className="scr-num">{index}</span>

      {/* Front */}
      <div className="scr-front">
        <span className="scr-label">TERM</span>
        <span className="scr-text">{card.front}</span>
        {card.pronunciation && (
          <span className="scr-pronunciation">{card.pronunciation}</span>
        )}
      </div>

      {/* Divider */}
      <div className="scr-divider" />

      {/* Back */}
      <div className="scr-back">
        <span className="scr-label">DEFINITION</span>
        <span className="scr-text">{card.back}</span>
        {card.example && (
          <span className="scr-example">"{card.example}"</span>
        )}
      </div>

      {/* Actions */}
      {!readonly && (
        <div className="scr-actions">
          <button
            className="scr-btn scr-btn--edit"
            onClick={onEdit}
            title="Edit card"
            aria-label="Edit card"
          >
            <FiEdit2 size={13} />
          </button>
          <button
            className="scr-btn scr-btn--delete"
            onClick={onDelete}
            title="Delete card"
            aria-label="Delete card"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
