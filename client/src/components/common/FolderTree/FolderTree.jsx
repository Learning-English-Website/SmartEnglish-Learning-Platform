import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { InputGroup, Form, Button } from 'react-bootstrap';
import { FiFolder, FiFolderPlus, FiEdit2, FiTrash2, FiChevronRight, FiChevronDown, FiCheck, FiX } from 'react-icons/fi';
import './FolderTree.css';

/**
 * FolderTree — recursive folder navigation component
 *
 * @param {Folder[]} folders - All folders (flat list from API)
 * @param {string|null} selectedFolderId - Currently selected folder
 * @param {function} onSelectFolder - Callback when folder is selected
 * @param {function} onCreateFolder - Callback to create new folder
 * @param {function} onRenameFolder - Callback to rename folder
 * @param {function} onDeleteFolder - Callback to delete folder
 */
export default function FolderTree({
  folders = [],
  selectedFolderId = null,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Build tree structure from flat list
  const buildTree = (parentId = null) => {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((folder) => ({
        ...folder,
        children: buildTree(folder._id),
      }));
  };

  const toggleExpand = (folderId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleStartEdit = (folder) => {
    setEditingId(folder._id);
    setEditValue(folder.name);
  };

  const handleSaveEdit = (folderId) => {
    if (editValue.trim()) {
      onRenameFolder?.(folderId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder?.(newFolderName.trim());
      setNewFolderName('');
      setShowCreateInput(false);
    }
  };

  const renderFolder = (folder, level = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedIds.has(folder._id);
    const isSelected = selectedFolderId === folder._id;
    const isEditing = editingId === folder._id;

    return (
      <div key={folder._id} className="folder-tree-item-wrapper">
        <div
          className={`folder-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* Expand/collapse toggle */}
          <button
            className="folder-tree-toggle"
            onClick={() => toggleExpand(folder._id)}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {hasChildren ? (
              isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />
            ) : (
              <span style={{ width: 14 }} />
            )}
          </button>

          {/* Folder icon */}
          <span className="folder-tree-icon">
            <FiFolder size={16} />
          </span>

          {/* Folder name or edit input */}
          {isEditing ? (
            <InputGroup size="sm" className="folder-tree-edit-input">
              <Form.Control
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(folder._id);
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
              />
              <Button size="sm" variant="success" onClick={() => handleSaveEdit(folder._id)}>
                <FiCheck size={12} />
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                <FiX size={12} />
              </Button>
            </InputGroup>
          ) : (
            <button
              className="folder-tree-name"
              onClick={() => onSelectFolder?.(folder._id)}
            >
              {folder.name}
            </button>
          )}

          {/* Actions (only when not editing) */}
          {!isEditing && (
            <div className="folder-tree-actions">
              <button
                className="folder-tree-action-btn"
                onClick={() => handleStartEdit(folder)}
                title="Rename folder"
                aria-label="Rename folder"
              >
                <FiEdit2 size={12} />
              </button>
              <button
                className="folder-tree-action-btn folder-tree-action-btn--delete"
                onClick={() => onDeleteFolder?.(folder._id)}
                title="Delete folder"
                aria-label="Delete folder"
              >
                <FiTrash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="folder-tree-children">
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = buildTree(null);

  return (
    <div className="folder-tree">
      {/* Header */}
      <div className="folder-tree-header">
        <span className="folder-tree-title">Folders</span>
        <button
          className="folder-tree-add-btn"
          onClick={() => setShowCreateInput(true)}
          title="Create folder"
          aria-label="Create new folder"
        >
          <FiFolderPlus size={14} />
        </button>
      </div>

      {/* "All Sets" link */}
      <div className={`folder-tree-item ${selectedFolderId === null ? 'selected' : ''}`}>
        <button className="folder-tree-name" onClick={() => onSelectFolder?.(null)}>
          All Sets
        </button>
      </div>

      {/* Create folder input */}
      {showCreateInput && (
        <div className="folder-tree-create">
          <InputGroup size="sm">
            <Form.Control
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowCreateInput(false);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            <Button size="sm" variant="success" onClick={handleCreateFolder}>
              <FiCheck size={12} />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => {
              setShowCreateInput(false);
              setNewFolderName('');
            }}>
              <FiX size={12} />
            </Button>
          </InputGroup>
        </div>
      )}

      {/* Folder list */}
      <div className="folder-tree-list">
        {rootFolders.length === 0 && !showCreateInput ? (
          <p className="folder-tree-empty">No folders yet</p>
        ) : (
          rootFolders.map((folder) => renderFolder(folder))
        )}
      </div>
    </div>
  );
}
