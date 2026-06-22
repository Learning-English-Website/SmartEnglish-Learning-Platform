import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Folder, Plus, Clock, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { folderService } from '../../api/folderService';
import { FilterDropdown, ConfirmModal } from '../../components/common';
import SetCard from '../../components/common/SetCard/SetCard';
import CreateFolderModal from './CreateFolderModal';
import './LibraryPage.css';

const TABS = [
  { id: 'sets', label: 'Học phần', icon: BookOpen },
  { id: 'folders', label: 'Thư mục', icon: Folder },
];

export default function LibraryPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sets');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState(null);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
  };

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

  const handleDeleteFolder = (folder, e) => {
    e.stopPropagation();
    setDeleteFolderTarget(folder);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    setDeleting(true);
    try {
      await folderService.delete(deleteFolderTarget._id);
      setFolders((prev) => prev.filter((f) => f._id !== deleteFolderTarget._id));
      toast.success('Xóa thư mục thành công.');
      setDeleteFolderTarget(null);
    } catch (err) {
      console.error('Delete folder failed:', err);
      toast.error('Xóa thư mục thất bại.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = () => {
    setShowCreateFolderModal(true);
  };

  const handleOpenFolder = (folder) => {
    navigate(`/folders/${folder._id}/${encodeURIComponent(folder.name)}`);
  };

  // Helper to group items by modified date relative titles
  const getGroupHeader = (dateString) => {
    if (!dateString) return 'KHÁC';
    const date = new Date(dateString);
    const now = new Date();

    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = d2 - d1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'GẦN ĐÂY';
    } else if (diffDays === 1) {
      return 'HÔM QUA';
    } else if (diffDays <= 7) {
      return 'TUẦN NÀY';
    } else {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `THÁNG ${month} NĂM ${year}`;
    }
  };

  const getGroupedItems = (items) => {
    const groupKeys = [];
    const groups = {};
    items.forEach((item) => {
      const header = getGroupHeader(item.updatedAt || item.createdAt);
      if (!groups[header]) {
        groups[header] = [];
        groupKeys.push(header);
      }
      groups[header].push(item);
    });
    return { groupKeys, groups };
  };

  const filteredSets = sets.filter((set) =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter((folder) => {
    const matchesSearch = folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isRoot = !folder.parent && !folder.parentId;
    return matchesSearch && isRoot;
  });

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
              onClick={() => handleTabChange(tab.id)}
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
              <div className="library-filter-left">
                <FilterDropdown />
                <div className="library-search-wrapper">
                  <Search size={16} className="library-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm học phần..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="library-search-input"
                  />
                </div>
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
              <BookOpen size={48} />
              <h3>Chưa có học phần nào</h3>
              <p>Tạo học phần đầu tiên để bắt đầu học tập!</p>
              {isOwnProfile && (
                <button className="library-create-btn-empty" onClick={handleCreateSet}>
                  <Plus size={18} />
                  Tạo học phần
                </button>
              )}
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="library-search-empty">
              <h3>Không tìm thấy kết quả</h3>
              <p>Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <div className="library-sets-list">
              {(() => {
                const { groupKeys, groups } = getGroupedItems(filteredSets);
                return groupKeys.map((key) => (
                  <div key={key} className="library-date-group">
                    <h4 className="library-group-title">{key}</h4>
                    <div className="library-group-list">
                      {groups[key].map((set) => (
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
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Folders Tab */}
      {activeTab === 'folders' && (
        <div className="library-folders-section">
          {/* Filter Bar */}
          <div className="library-filter-bar">
            <div className="library-filter-left">
              <FilterDropdown />
              <div className="library-search-wrapper">
                <Search size={16} className="library-search-icon" />
                <input
                  type="text"
                  placeholder="Tìm kiếm thư mục..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="library-search-input"
                />
              </div>
            </div>
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
              <Folder size={48} />
              <h3>Chưa có thư mục nào</h3>
              <p>Tạo thư mục đầu tiên để sắp xếp các học phần!</p>
              {isOwnProfile && (
                <button className="library-create-btn-empty" onClick={handleCreateFolder}>
                  <Folder size={18} />
                  Tạo thư mục
                </button>
              )}
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="library-search-empty">
              <h3>Không tìm thấy kết quả</h3>
              <p>Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <div className="library-folders-list">
              {(() => {
                const { groupKeys, groups } = getGroupedItems(filteredFolders);
                return groupKeys.map((key) => (
                  <div key={key} className="library-date-group">
                    <h4 className="library-group-title">{key}</h4>
                    <div className="library-group-list">
                      {groups[key].map((folder) => (
                        <div
                          key={folder._id}
                          className="library-folder-card"
                          onClick={() => handleOpenFolder(folder)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleOpenFolder(folder); }}
                        >
                          <div className="lfc-icon-wrapper">
                            <Folder size={22} />
                          </div>
                          <div className="lfc-info" style={{ flexGrow: 1 }}>
                            <span className="lfc-name">{folder.name}</span>
                            <span className="lfc-count">{folder.sets?.length ?? 0} học phần</span>
                          </div>
                          <button
                            className="lfc-delete-btn"
                            onClick={(e) => handleDeleteFolder(folder, e)}
                            title="Xóa thư mục"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
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

      <ConfirmModal
        show={!!deleteFolderTarget}
        onHide={() => setDeleteFolderTarget(null)}
        onConfirm={handleConfirmDeleteFolder}
        title="Xóa thư mục"
        message={`Bạn có chắc chắn muốn xóa thư mục "${deleteFolderTarget?.name}"? Các thư mục con bên trong sẽ được đưa ra ngoài thư mục gốc.`}
        confirmText="Xóa"
        confirmVariant="danger"
        loading={deleting}
      />

      {showCreateFolderModal && (
        <CreateFolderModal
          onClose={() => setShowCreateFolderModal(false)}
          onCreated={(created) => {
            setFolders((prev) => [...prev, created]);
            setShowCreateFolderModal(false);
          }}
        />
      )}
    </div>
  );
}
