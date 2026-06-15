import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Folder, Plus, BookOpen, GraduationCap, Clock, MoreHorizontal,
  Layers, StickyNote, Brain, ArrowLeft
} from 'lucide-react';
import { folderService } from '../../api/folderService';
import { setService } from '../../api/setService';
import { tagService } from '../../api/tagService';
import CreateFolderModal from './CreateFolderModal';
import CreateTagModal from './CreateTagModal';
import { toast } from 'react-hot-toast';
import './FolderPage.css';

export default function FolderPage() {
  const { id: folderId, slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [folder, setFolder] = useState(null);
  const [sets, setSets] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagId, setActiveTagId] = useState(null); // null = "Tất cả"
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const menuRef = useRef(null);

  // Open create folder modal if ?new=folder
  useEffect(() => {
    if (searchParams.get('new') === 'folder') {
      setShowCreateFolderModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!folderId) {
      navigate('/library');
      return;
    }

    const fetchFolder = async () => {
      setLoading(true);
      setError(null);
      try {
        const [setsRes, subRes, tagsRes] = await Promise.all([
          folderService.getSets(folderId),
          folderService.getSubfolders(folderId),
          tagService.getAll(folderId),
        ]);
        const data = setsRes?.data ?? setsRes;
        setFolder(data);
        setSets(Array.isArray(data.sets) ? data.sets : []);
        const subs = subRes?.data ?? subRes;
        setSubfolders(Array.isArray(subs) ? subs : []);
        const tg = tagsRes?.data ?? tagsRes;
        setTags(Array.isArray(tg) ? tg : []);
      } catch (err) {
        console.error('Failed to load folder:', err);
        setError('Không thể tải thư mục.');
      } finally {
        setLoading(false);
      }
    };

    const fetchFolderWrapper = () => {
      fetchFolder();
    };
    fetchFolderWrapper();
  }, [folderId, navigate]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSet = () => {
    const params = new URLSearchParams();
    if (folderId) params.set('folderId', folderId);
    if (activeTagId) params.set('tagId', activeTagId);
    const query = params.toString();
    navigate(`/flashcards/sets/create${query ? `?${query}` : ''}`);
  };

  const handleDeleteSet = async (set, e) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa học phần "${set.title}"?`)) return;
    try {
      await setService.delete(set._id);
      setSets((prev) => prev.filter((s) => s._id !== set._id));
      toast.success('Xóa học phần thành công.');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Xóa học phần thất bại.');
    }
    setOpenMenuId(null);
  };

  const handleLearn = (set, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    navigate(`/study-sets/${set._id}/learn`);
  };

  const handleEditSet = (set, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    navigate(`/flashcards/sets/${set._id}/edit`);
  };

  const handleOpenSubfolder = (sub) => {
    navigate(`/folders/${sub._id}/${encodeURIComponent(sub.name)}`);
  };

  const handleCreateSubfolder = () => {
    navigate(`/folders/${folderId}/${encodeURIComponent(slug || folder?.name || 'folder')}?new=folder`);
  };

  const handleCreatedSubfolder = (created) => {
    setShowCreateFolderModal(false);
    setSubfolders((prev) => [...prev, created]);
  };

  const handleCreatedTag = (created) => {
    setTags((prev) => [...prev, created]);
    setActiveTagId(created._id);
  };

  // Filter sets by search query AND selected tag
  const filteredSets = sets.filter((set) => {
    const matchesSearch = set.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !activeTagId || set.tags?.some((t) => t._id === activeTagId);
    return matchesSearch && matchesTag;
  });

  const isEmpty = subfolders.length === 0 && filteredSets.length === 0 && !loading;

  if (loading) {
    return (
      <div className="folder-page">
        <div className="folder-loading">
          <div className="folder-spinner" />
          <span>Đang tải thư mục...</span>
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="folder-page">
        <div className="folder-container">
          <div className="folder-error-state">
            <p>{error || 'Không tìm thấy thư mục.'}</p>
            <button className="folder-back-btn" onClick={() => navigate('/library')}>
              ← Quay lại thư viện
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="folder-page">
      <div className="folder-container">
        
        {/* Back Link */}
        <button className="folder-back-link" onClick={() => navigate('/library')}>
          <ArrowLeft size={16} />
          <span>Quay lại thư viện</span>
        </button>

        {/* Header */}
        <div className="folder-header">
          <div className="folder-header-left">
            <div className="folder-icon-lg">
              <Folder size={36} />
            </div>
            <div className="folder-header-info">
              <h1 className="folder-title-lg">{slug || folder.name}</h1>
              <p className="folder-meta-lg">
                {sets.length} học phần {subfolders.length > 0 && `• ${subfolders.length} thư mục con`}
              </p>
            </div>
          </div>
          <button className="folder-more-btn">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="folder-pills-row">
          {/* Always show "Tất cả" */}
          <button
            className={`folder-pill ${activeTagId === null ? 'active' : ''}`}
            onClick={() => setActiveTagId(null)}
          >
            Tất cả
          </button>

          {/* User's tags */}
          {tags.map((tag) => (
            <button
              key={tag._id}
              className={`folder-pill ${activeTagId === tag._id ? 'active' : ''}`}
              onClick={() => setActiveTagId(tag._id)}
              style={
                activeTagId === tag._id
                  ? { background: `${tag.color}18`, borderColor: tag.color, color: tag.color }
                  : {}
              }
            >
              {tag.name}
            </button>
          ))}

          {/* Add tag button */}
          <button
            className="folder-pill folder-pill-add"
            onClick={() => setShowCreateTagModal(true)}
          >
            +
          </button>
        </div>

        {/* Content */}
        {isEmpty ? (
          <EmptyFolderState onAddStudy={() => handleCreateSet()} />
        ) : (
          <div className="folder-content">
            {/* Main column */}
            <div className="folder-main-col">

              {/* Subfolders */}
              {subfolders.length > 0 && (
                <div className="folder-section">
                  <h2 className="folder-section-title">Thư mục con</h2>
                  <div className="folder-subfolders-grid">
                    {subfolders.map((sub) => (
                      <div
                        key={sub._id}
                        className="folder-subfolder-card"
                        onClick={() => handleOpenSubfolder(sub)}
                      >
                        <div className="fsc-icon">
                          <Folder size={20} />
                        </div>
                        <span className="fsc-name">{sub.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Sets */}
              <div className="folder-section">
                <div className="folder-section-header">
                  <h2 className="folder-section-title">Học phần</h2>
                  <button className="folder-sort-btn">
                    <Clock size={13} />
                    <span>Gần đây</span>
                  </button>
                </div>

                {filteredSets.length === 0 ? (
                  <div className="folder-sets-empty">
                    <p>Chưa có học phần nào</p>
                    <button className="folder-add-set-btn" onClick={handleCreateSet}>
                      <Plus size={15} /> Thêm học phần
                    </button>
                  </div>
                ) : (
                  <div className="folder-sets-list">
                    {filteredSets.map((set) => (
                      <div
                        key={set._id}
                        className="folder-set-item"
                        onClick={() => navigate(`/study-sets/${set._id}`)}
                      >
                        <div className="fsi-icon">
                          <BookOpen size={18} />
                        </div>
                        <div className="fsi-info">
                          <span className="fsi-title">{set.title}</span>
                          <span className="fsi-meta">
                            {set.cardCount ?? 0} thuật ngữ • Tác giả bạn
                          </span>
                        </div>
                        <div className="fsi-actions" ref={openMenuId === set._id ? menuRef : null}>
                          <button
                            className="fsi-more-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === set._id ? null : set._id);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openMenuId === set._id && (
                            <div className="fsi-menu">
                              <button className="fsi-menu-item" onClick={(e) => handleLearn(set, e)}>
                                <GraduationCap size={14} />
                                Học
                              </button>
                              <button className="fsi-menu-item" onClick={(e) => handleEditSet(set, e)}>
                                Chỉnh sửa
                              </button>
                              <button className="fsi-menu-item danger" onClick={(e) => handleDeleteSet(set, e)}>
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAB */}
        {!isEmpty && (
          <div className="folder-fab">
            <button className="folder-fab-add" onClick={handleCreateSet}>
              <Plus size={18} />
              Thêm tài liệu học
            </button>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <CreateFolderModal
          parentId={folderId}
          onClose={() => {
            setShowCreateFolderModal(false);
            navigate(`/folders/${folderId}/${encodeURIComponent(slug || folder?.name || 'folder')}`);
          }}
          onCreated={handleCreatedSubfolder}
        />
      )}

      {/* Create Tag Modal */}
      {showCreateTagModal && (
        <CreateTagModal
          folderId={folderId}
          onClose={() => setShowCreateTagModal(false)}
          onCreated={handleCreatedTag}
        />
      )}
    </div>
  );
}

/* ── Empty Folder State ─────────────────────────── */
function EmptyFolderState({ onAddStudy }) {
  return (
    <div className="folder-empty-wrap">
      <div className="folder-empty-card">
        {/* Illustration */}
        <div className="folder-empty-icons">
          <div className="fei-icon fei-flashcard">
            <Layers size={26} />
          </div>
          <div className="fei-icon fei-note">
            <StickyNote size={26} />
          </div>
          <div className="fei-icon fei-brain">
            <Brain size={26} />
          </div>
        </div>

        <h2 className="folder-empty-title">Bắt đầu xây dựng thư mục của bạn</h2>

        <div className="folder-empty-actions">
          <button className="folder-empty-btn-primary" onClick={onAddStudy}>
            Thêm tài liệu học
          </button>
        </div>
      </div>
    </div>
  );
}
