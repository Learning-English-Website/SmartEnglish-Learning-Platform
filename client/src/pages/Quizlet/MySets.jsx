import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FiPlus, FiBook, FiRefreshCw, FiFolder } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { folderService } from '../../api/folderService';
import SetCard from '../../components/common/SetCard/SetCard';
import FolderTree from '../../components/common/FolderTree/FolderTree';
import { ConfirmModal } from '../../components/common/Modal/Modal';
import { LoadingSpinner } from '../../components/common';
import './MySets.css';

export default function MySets() {
  const navigate = useNavigate();

  const [mySets, setMySets] = useState([]);
  const [allSets, setAllSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Folder state
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [folderLoading, setFolderLoading] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await setService.getMySets();
      setAllSets(res?.data ?? (Array.isArray(res) ? res : []));
      setMySets(res?.data ?? (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch folders
  useEffect(() => {
    folderService.getAll()
      .then((res) => {
        // axiosClient interceptor unwraps .data, so res is already the array
        const foldersData = Array.isArray(res) ? res : (res?.data ?? []);
        setFolders(foldersData.map((f) => ({
          ...f,
          parentId: f.parentId || f.parent,
          sets: f.sets || [],
        })));
      })
      .catch(() => setFolders([]));
  }, []);

  // Filter sets by selected folder
  const filteredSets = useMemo(() => {
    if (!selectedFolderId) {
      return allSets;
    }
    // Get sets that are in the selected folder
    const folder = folders.find((f) => f._id === selectedFolderId);
    if (!folder || !folder.sets) {
      return allSets;
    }
    const folderSetIds = folder.sets.map((s) => (typeof s === 'string' ? s : s.toString()));
    return allSets.filter((set) => folderSetIds.includes(set._id.toString()));
  }, [allSets, folders, selectedFolderId]);

  // Update mySets when filteredSets changes
  useEffect(() => {
    setMySets(filteredSets);
  }, [filteredSets]);

  // Get selected folder info
  const selectedFolder = useMemo(() => {
    return folders.find((f) => f._id === selectedFolderId);
  }, [folders, selectedFolderId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await setService.delete(deleteTarget.id);
      setMySets((prev) => prev.filter((s) => s._id !== deleteTarget.id));
      toast.success(`Đã xóa "${deleteTarget.title}"`);
      setDeleteTarget(null);
    } catch {
      toast.error('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  // Folder handlers
  const handleCreateFolder = async (name) => {
    try {
      const res = await folderService.create(name, null);
      // folderService returns data directly (interceptor unwraps .data)
      const newFolder = res?.data ?? res;
      if (newFolder) {
        const normalized = {
          ...newFolder,
          parentId: newFolder.parentId || newFolder.parent,
          sets: newFolder.sets || [],
        };
        setFolders((prev) => [...prev, normalized]);
        toast.success('Folder created!');
      }
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId, name) => {
    try {
      const res = await folderService.update(folderId, name);
      const updated = res?.data ?? res;
      setFolders((prev) => prev.map((f) => f._id === folderId ? { ...f, ...updated } : f));
      toast.success('Folder renamed');
    } catch {
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    setDeleting(true);
    try {
      await folderService.delete(deleteFolderTarget);
      setFolders((prev) => prev.filter((f) => String(f._id) !== String(deleteFolderTarget)));
      if (selectedFolderId === deleteFolderTarget) {
        setSelectedFolderId(null);
      }
      toast.success('Folder deleted');
      setDeleteFolderTarget(null);
    } catch {
      toast.error('Failed to delete folder');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell my-sets-page">
      <Container>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="my-sets-header">
          <div>
            <h1>
              {selectedFolder ? (
                <>
                  <FiFolder className="my-sets-title-icon" />
                  {selectedFolder.name}
                </>
              ) : (
                <>
                  <FiBook className="my-sets-title-icon" />
                  My Flashcard Sets
                </>
              )}
            </h1>
            <p className="my-sets-subtitle">
              {loading ? '' : `${filteredSets.length} set${filteredSets.length !== 1 ? 's' : ''}`}
              {selectedFolder && ` in folder`}
            </p>
          </div>
          <div className="my-sets-header-actions">
            <button
              className="my-sets-btn-refresh"
              onClick={fetchAll}
              disabled={loading}
              title="Làm mới"
              aria-label="Làm mới danh sách"
            >
              <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button
              className="btn-glassline-primary my-sets-btn-create"
              onClick={() => navigate('/flashcards/sets/create')}
              id="create-set-btn"
            >
              <FiPlus size={16} />
              Create New Set
            </button>
          </div>
        </div>

        {/* ── Main Content: Sidebar + Grid ───────────────────────────── */}
        <div className="my-sets-content">
          {/* Sidebar */}
          <aside className="my-sets-sidebar">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={(id) => setDeleteFolderTarget(id)}
            />
          </aside>

          {/* Sets Grid */}
          <main className="my-sets-main">
            {/* ── Loading ──────────────────────────────────────────────────── */}
            {loading ? (
              <div className="my-sets-loading">
                <LoadingSpinner text="Đang tải..." />
              </div>
            ) : error ? (
              <div className="my-sets-error">
                <p>{error}</p>
                <button className="btn-glassline-primary" onClick={fetchAll}>
                  <FiRefreshCw size={14} /> Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* ── Empty State ─────────────────────────────────────────────── */}
                {mySets.length === 0 && (
                  <div className="my-sets-empty">
                    <div className="my-sets-empty-icon">📚</div>
                    <h2>Bạn chưa có flashcard set nào</h2>
                    <p>Tạo set đầu tiên để bắt đầu học!</p>
                    <button
                      className="btn-glassline-primary"
                      onClick={() => navigate('/flashcards/sets/create')}
                    >
                      <FiPlus size={16} /> Tạo Set Đầu Tiên
                    </button>
                  </div>
                )}

<<<<<<< Updated upstream
                {/* ── My Sets Grid ─────────────────────────────────────────── */}
                {mySets.length > 0 && (
                  <div className="my-sets-grid">
                    {mySets.map((set) => (
                      <SetCard
                        key={set._id}
                        set={set}
                        onEdit={() => navigate(`/flashcards/sets/${set._id}/edit`)}
                        onDelete={() => setDeleteTarget({ id: set._id, title: set.title })}
                      />
                    ))}
                  </div>
                )}
              </>
=======
            {/* ── Public / Community Sets Section ──────────────────────── */}
            {publicSets.length > 0 && (
              <div className="my-sets-community">
                <div className="my-sets-section-header">
                  <FiGlobe size={18} className="my-sets-title-icon" />
                  <h2>Discover Community Sets</h2>
                  <span className="my-sets-section-badge">{publicSets.length} sets</span>
                </div>
                <div className="my-sets-grid">
                  {publicSets.map((set) => (
                    <SetCard
                      key={set._id}
                      set={set}
                      showActions={false}
                      linkUrl={`/community/sets/${set._id}`}
                    />
                  ))}
                </div>
              </div>
>>>>>>> Stashed changes
            )}
          </main>
        </div>
      </Container>

      {/* Delete Set Modal */}
      <ConfirmModal
        show={!!deleteTarget}
        onHide={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa Flashcard Set"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        confirmVariant="danger"
        loading={deleting}
      />

      {/* Delete Folder Modal */}
      <ConfirmModal
        show={!!deleteFolderTarget}
        onHide={() => setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
        title="Xóa Folder"
        message={`Bạn có chắc muốn xóa folder này? Các folder con bên trong sẽ được chuyển ra ngoài.`}
        confirmText="Xóa"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
