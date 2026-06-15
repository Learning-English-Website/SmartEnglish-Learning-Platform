import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Folder, Users, FileText, Sparkles, Plus, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { folderService } from '../../api/folderService';
import { FilterDropdown, ConfirmModal } from '../../components/common';
import SetCard from '../../components/common/SetCard/SetCard';
import './LibraryPage.css';

const TABS = [
  { id: 'sets', label: 'Học phần', icon: BookOpen },
  { id: 'folders', label: 'Thư mục', icon: Folder },
  { id: 'classes', label: 'Lớp học', icon: Users },
  { id: 'tests', label: 'Bài kiểm tra', icon: FileText },
  { id: 'expert', label: 'Lời giải chuyên gia', icon: Sparkles },
];

export default function LibraryPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sets');
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState(null);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isOwnProfile = !username || user?.username === username;

  useEffect(() => {
    if (activeTab !== 'sets' || !isOwnProfile) return;

    setLoading(true);
    setError(null);
    setService.getMySets()
      .then((data) => setSets(Array.isArray(data) ? data : data?.data ?? []))
      .catch((err) => {
        console.error('Failed to fetch sets:', err);
        setError('Không thể tải học phần.');
        setSets([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, isOwnProfile, username]);

  useEffect(() => {
    if (activeTab !== 'folders' || !isOwnProfile) return;

    setLoading(true);
    setError(null);
    folderService.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setFolders(list);
      })
      .catch((err) => {
        console.error('Failed to fetch folders:', err);
        setError('Không thể tải thư mục.');
        setFolders([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, isOwnProfile]);

  const handleCreateSet = () => navigate('/flashcards/sets/create');

  const handleEditSet = (set) => navigate(`/flashcards/sets/${set._id}/edit`);

  const handleDeleteSet = (set) => {
    setDeleteTarget(set);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await setService.delete(deleteTarget._id);
      setSets((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      toast.success('Xóa học phần thành công.');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Xóa học phần thất bại.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt('Tên thư mục mới:');
    if (!name?.trim()) return;
    try {
      const newFolder = await folderService.create(name.trim());
      const created = newFolder?.data ?? newFolder;
      setFolders((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleOpenFolder = (folder) => {
    navigate(`/folders/${folder._id}/${encodeURIComponent(folder.name)}`);
  };

  return (
    <div className="library-page">
      {/* Library Header */}
      <div className="library-profile-header">
        <h1 className="library-profile-name">Thư viện của bạn</h1>
      </div>

      {/* Tabs */}
      <div className="library-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`library-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'sets' && (
        <div className="library-sets-content">
          {isOwnProfile && (
            <div className="library-actions-bar">
              <div className="library-sort-info">
                <Clock size={14} />
                <span>{sets.length} học phần</span>
              </div>
              <button className="library-create-btn" onClick={handleCreateSet}>
                <Plus size={16} />
                Tạo học phần
              </button>
            </div>
          )}

          {loading ? (
            <div className="library-loading">
              <div className="spinner" />
              <span>Đang tải...</span>
            </div>
          ) : error ? (
            <div className="library-error">
              <p>{error}</p>
            </div>
          ) : sets.length === 0 ? (
            <div className="library-empty">
              <BookOpen size={56} />
              <h3>Chưa có học phần nào</h3>
              <p>Tạo học phần đầu tiên để bắt đầu học!</p>
              {isOwnProfile && (
                <button className="library-create-btn-empty" onClick={handleCreateSet}>
                  <Plus size={18} />
                  Tạo học phần
                </button>
              )}
            </div>
          ) : (
            <div className="library-sets-list">
              {sets.map((set) => (
                <SetCard
                  key={set._id}
                  set={set}
                  showActions={isOwnProfile}
                  onClick={() => navigate(`/flashcards/sets/${set._id}`)}
                  onEdit={() => handleEditSet(set)}
                  onDelete={() => handleDeleteSet(set)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Folders Tab */}
      {activeTab === 'folders' && (
        <div className="library-folders-section">
          {/* Filter Bar */}
          <div className="library-filter-bar">
            <FilterDropdown />
            <button className="library-create-btn" onClick={handleCreateFolder}>
              <Folder size={14} />
              Tạo thư mục
            </button>
          </div>

          {loading ? (
            <div className="library-loading">
              <div className="spinner" />
              <span>Đang tải...</span>
            </div>
          ) : error ? (
            <div className="library-error">
              <p>{error}</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="library-empty">
              <Folder size={56} />
              <h3>Chưa có thư mục nào</h3>
              <p>Tạo thư mục đầu tiên để sắp xếp học phần!</p>
              {isOwnProfile && (
                <button className="library-create-btn-empty" onClick={handleCreateFolder}>
                  <Folder size={18} />
                  Tạo thư mục
                </button>
              )}
            </div>
          ) : (
            <div className="library-folders-list">
              {folders.map((folder) => (
                <div
                  key={folder._id}
                  className="library-folder-card"
                  onClick={() => handleOpenFolder(folder)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpenFolder(folder); }}
                >
                  <div className="lfc-top">{folder.sets?.length ?? 0} mục</div>
                  <div className="lfc-bottom">
                    <div className="lfc-icon">
                      <Folder size={20} />
                    </div>
                    <span className="lfc-name">{folder.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab !== 'sets' && activeTab !== 'folders' && (
        <div className="library-content">
          <div className="library-empty">
            <BookOpen size={56} />
            <h3>Chưa có nội dung</h3>
            <p>Tính năng đang phát triển.</p>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!deleteTarget}
        onHide={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa học phần"
        message={`Bạn có chắc chắn muốn xóa học phần "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
