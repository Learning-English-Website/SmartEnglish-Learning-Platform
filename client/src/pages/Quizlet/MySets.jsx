import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FiPlus, FiBook, FiRefreshCw, FiFolder, FiGlobe, FiBookmark } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { folderService } from '../../api/folderService';
import { shareService } from '../../api/shareService';
import SetCard from '../../components/common/SetCard/SetCard';
import FolderTree from '../../components/common/FolderTree/FolderTree';
import { ConfirmModal } from '../../components/common/Modal/Modal';
import { LoadingSpinner, SkeletonPage } from '../../components/common';
import './MySets.css';

export default function MySets() {
  const navigate = useNavigate();

  const [allSets, setAllSets] = useState([]);
  const [publicSets, setPublicSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bookmarkedSetIds, setBookmarkedSetIds] = useState(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [mySetsResult, publicSetsResult] = await Promise.all([
        setService.getMySets(),
        setService.getPublicSets({ page: 1, pageSize: 6 }),
      ]);

      const mySetsData = mySetsResult?.data ?? (Array.isArray(mySetsResult) ? mySetsResult : []);
      const publicSetsData = publicSetsResult?.data ?? (Array.isArray(publicSetsResult) ? publicSetsResult : []);

      setAllSets(mySetsData);
      setPublicSets(publicSetsData);
    } catch (err) {
      console.error(err);
      setError('Khong the tai danh sach. Vui long thu lai.');
      setAllSets([]);
      setPublicSets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchAll);
  }, [fetchAll]);

  useEffect(() => {
    folderService.getAll()
      .then((res) => {
        const foldersData = Array.isArray(res) ? res : (res?.data ?? []);
        setFolders(foldersData.map((folder) => ({
          ...folder,
          parentId: folder.parentId || folder.parent,
          sets: folder.sets || [],
        })));
      })
      .catch(() => setFolders([]));
  }, []);

  // Fetch bookmarks
  useEffect(() => {
    const fetchBookmarks = async () => {
      setBookmarksLoading(true);
      try {
        const res = await shareService.getBookmarks();
        const data = res?.data ?? res;
        const bookmarkList = Array.isArray(data) ? data : [];
        setBookmarks(bookmarkList);
        setBookmarkedSetIds(new Set(bookmarkList.map((s) => s._id)));
      } catch {
        setBookmarks([]);
      } finally {
        setBookmarksLoading(false);
      }
    };
    fetchBookmarks();
  }, []);

  const handleToggleBookmark = async (setId) => {
    try {
      if (bookmarkedSetIds.has(setId)) {
        await shareService.unbookmark(setId);
        setBookmarkedSetIds((prev) => {
          const next = new Set(prev);
          next.delete(setId);
          return next;
        });
        setBookmarks((prev) => prev.filter((s) => s._id !== setId));
        toast.success('Removed from bookmarks');
      } else {
        await shareService.bookmark(setId);
        setBookmarkedSetIds((prev) => new Set(prev).add(setId));
        const setData = allSets.find((s) => s._id === setId);
        if (setData) setBookmarks((prev) => [...prev, setData]);
        toast.success('Added to bookmarks');
      }
    } catch {
      toast.error('Failed to update bookmark');
    }
  };

  const filteredSets = useMemo(() => {
    if (!selectedFolderId) {
      return allSets;
    }

    const folder = folders.find((item) => item._id === selectedFolderId);
    if (!folder || !folder.sets) {
      return allSets;
    }

    const folderSetIds = folder.sets.map((setId) => (typeof setId === 'string' ? setId : setId.toString()));
    return allSets.filter((set) => folderSetIds.includes(set._id.toString()));
  }, [allSets, folders, selectedFolderId]);

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder._id === selectedFolderId),
    [folders, selectedFolderId]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await setService.delete(deleteTarget.id);
      setAllSets((prev) => prev.filter((set) => set._id !== deleteTarget.id));
      toast.success(`Da xoa "${deleteTarget.title}"`);
      setDeleteTarget(null);
    } catch {
      toast.error('Xoa that bai. Vui long thu lai.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async (name) => {
    try {
      const res = await folderService.create(name, null);
      const newFolder = res?.data ?? res;

      if (newFolder) {
        setFolders((prev) => [
          ...prev,
          {
            ...newFolder,
            parentId: newFolder.parentId || newFolder.parent,
            sets: newFolder.sets || [],
          },
        ]);
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
      setFolders((prev) => prev.map((folder) => (
        folder._id === folderId ? { ...folder, ...updated } : folder
      )));
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
      setFolders((prev) => prev.filter((folder) => String(folder._id) !== String(deleteFolderTarget)));
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

  return (
    <div className="page-shell my-sets-page">
      <Container>
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
              {selectedFolder ? ' in folder' : ''}
            </p>
          </div>

          <div className="my-sets-header-actions">
            <button
              className="my-sets-btn-refresh"
              onClick={fetchAll}
              disabled={loading}
              title="Lam moi"
              aria-label="Lam moi danh sach"
            >
              <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>

            <button
              className={`btn-glassline-outline my-sets-btn-bookmarks ${showBookmarks ? 'active' : ''}`}
              onClick={() => setShowBookmarks((v) => !v)}
              id="bookmarks-btn"
            >
              <FiBookmark size={16} />
              Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
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

        <div className="my-sets-content">
          <aside className="my-sets-sidebar">
            <FolderTree
              folders={folders}
              selectedFolderId={showBookmarks ? '__bookmarks__' : selectedFolderId}
              onSelectFolder={(id) => {
                if (id === '__bookmarks__') {
                  setShowBookmarks(true);
                } else {
                  setShowBookmarks(false);
                  setSelectedFolderId(id);
                }
              }}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={(id) => setDeleteFolderTarget(id)}
            />
            <div className="my-sets-sidebar-bookmarks">
              <button
                className={`my-sets-sidebar-bookmark-btn ${showBookmarks ? 'active' : ''}`}
                onClick={() => {
                  setShowBookmarks((v) => !v);
                  if (!showBookmarks) setSelectedFolderId(null);
                }}
              >
                <FiBookmark size={14} />
                Bookmarks
                {bookmarks.length > 0 && <span className="my-sets-sidebar-badge">{bookmarks.length}</span>}
              </button>
            </div>
          </aside>

          <main className="my-sets-main">
            {loading ? (
              <SkeletonPage cards={6} />
            ) : error ? (
              <div className="my-sets-error">
                <p>{error}</p>
                <button className="btn-glassline-primary" onClick={fetchAll}>
                  <FiRefreshCw size={14} /> Thu lai
                </button>
              </div>
            ) : (
              <>
                {/* Bookmarks Section */}
                {showBookmarks && (
                  <div className="my-sets-bookmarks">
                    <div className="my-sets-section-header">
                      <FiBookmark size={18} className="my-sets-title-icon" />
                      <h2>Bookmarked Sets</h2>
                      <span className="my-sets-section-badge">{bookmarks.length} sets</span>
                    </div>

                    {bookmarksLoading ? (
                      <LoadingSpinner text="Loading bookmarks..." />
                    ) : bookmarks.length === 0 ? (
                      <div className="my-sets-empty">
                        <div className="my-sets-empty-icon">🔖</div>
                        <p>No bookmarked sets yet.</p>
                      </div>
                    ) : (
                      <div className="my-sets-grid">
                        {bookmarks.map((set) => (
                          <SetCard
                            key={set._id}
                            set={set}
                            showActions={false}
                            linkUrl={`/shared/${set.shareCode || set._id}`}
                            isBookmarked={true}
                            onToggleBookmark={() => handleToggleBookmark(set._id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* My Sets Section */}
                {!showBookmarks && (
                  <>
                    {filteredSets.length === 0 && (
                      <div className="my-sets-empty">
                        <div className="my-sets-empty-icon">📚</div>
                        <h2>Ban chua co flashcard set nao</h2>
                        <p>Tao set dau tien de bat dau hoc!</p>
                        <button
                          className="btn-glassline-primary"
                          onClick={() => navigate('/flashcards/sets/create')}
                        >
                          <FiPlus size={16} /> Tao Set Dau Tien
                        </button>
                      </div>
                    )}

                    {filteredSets.length > 0 && (
                      <div className="my-sets-grid">
                        {filteredSets.map((set) => (
                          <SetCard
                            key={set._id}
                            set={set}
                            onEdit={() => navigate(`/flashcards/sets/${set._id}/edit`)}
                            onDelete={() => setDeleteTarget({ id: set._id, title: set.title })}
                            isBookmarked={bookmarkedSetIds.has(set._id)}
                            onToggleBookmark={() => handleToggleBookmark(set._id)}
                          />
                        ))}
                      </div>
                    )}

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
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </Container>

      <ConfirmModal
        show={!!deleteTarget}
        onHide={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoa Flashcard Set"
        message={`Ban co chac muon xoa "${deleteTarget?.title}"? Hanh dong nay khong the hoan tac.`}
        confirmText="Xoa"
        confirmVariant="danger"
        loading={deleting}
      />

      <ConfirmModal
        show={!!deleteFolderTarget}
        onHide={() => setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
        title="Xoa Folder"
        message="Ban co chac muon xoa folder nay? Cac folder con ben trong se duoc chuyen ra ngoai."
        confirmText="Xoa"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
