import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FiPlus, FiBook, FiRefreshCw, FiGlobe } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import SetCard from '../../components/common/SetCard/SetCard';
import { ConfirmModal } from '../../components/common/Modal/Modal';
import { LoadingSpinner } from '../../components/common';
import './MySets.css';

export default function MySets() {
  const navigate = useNavigate();

  const [mySets, setMySets]         = useState([]);
  const [publicSets, setPublicSets] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both in parallel
      const [myRes, pubRes] = await Promise.allSettled([
        setService.getMySets(),
        setService.getPublicSets({ limit: 12 }),
      ]);

      // My sets: axiosClient unwraps axios `.data` → { success, data: [] }
      if (myRes.status === 'fulfilled') {
        const r = myRes.value;
        setMySets(Array.isArray(r) ? r : (r?.data ?? []));
      }

      // Public sets
      if (pubRes.status === 'fulfilled') {
        const r = pubRes.value;
        // paginated response: { success, data: [], meta: { pagination } }
        setPublicSets(Array.isArray(r) ? r : (r?.data ?? []));
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell my-sets-page">
      <Container>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="my-sets-header">
          <div>
            <h1>
              <FiBook className="my-sets-title-icon" />
              My Flashcard Sets
            </h1>
            <p className="my-sets-subtitle">
              {loading ? '' : `${mySets.length} set${mySets.length !== 1 ? 's' : ''} của bạn`}
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
            {/* ── My Sets Section ──────────────────────────────────────── */}
            {mySets.length === 0 ? (
              <div className="my-sets-empty">
                <div className="my-sets-empty-icon">📚</div>
                <h2>Bạn chưa có flashcard set nào</h2>
                <p>Tạo set đầu tiên hoặc khám phá các set công khai bên dưới!</p>
                <button
                  className="btn-glassline-primary"
                  onClick={() => navigate('/flashcards/sets/create')}
                >
                  <FiPlus size={16} /> Tạo Set Đầu Tiên
                </button>
              </div>
            ) : (
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
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Container>

      {/* Delete Modal */}
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
    </div>
  );
}
