import { useState } from 'react';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import './NoteCard.css';

/**
 * NoteCard - displays a single note with edit/delete actions
 */
export default function NoteCard({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [editTitle, setEditTitle] = useState(note.title || '');
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(note._id, { content: editContent.trim(), title: editTitle.trim() });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setEditTitle(note.title || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this note?')) {
      await onDelete(note._id);
    }
  };

  if (isEditing) {
    return (
      <div className="note-card note-card--editing">
        <input
          type="text"
          className="note-card__title-input"
          placeholder="Note title (optional)"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          aria-label="Edit note title"
        />
        <textarea
          className="note-card__content-input"
          placeholder="Write your note..."
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={3}
          aria-label="Edit note content"
        />
        <div className="note-card__actions">
          <button
            className="note-card__btn note-card__btn--save"
            onClick={handleSave}
            disabled={isSaving || !editContent.trim()}
            aria-label="Save note"
          >
            <FiCheck size={14} /> Save
          </button>
          <button
            className="note-card__btn note-card__btn--cancel"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Cancel edit"
          >
            <FiX size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-card">
      {note.title && <h4 className="note-card__title">{note.title}</h4>}
      <p className="note-card__content">{note.content}</p>
      <div className="note-card__footer">
        <span className="note-card__timestamp">{formatDate(note.createdAt)}</span>
        <div className="note-card__actions">
          <button
            className="note-card__btn note-card__btn--edit"
            onClick={() => setIsEditing(true)}
            aria-label="Edit note"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            className="note-card__btn note-card__btn--delete"
            onClick={handleDelete}
            aria-label="Delete note"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
