import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FiPlus, FiBook } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import SetCard from '../../components/common/SetCard/SetCard';
import { ConfirmModal } from '../../components/common/Modal/Modal';
import { LoadingSpinner, SkeletonPage } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import './MySets.css';

export default function MySets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [allSets, setAllSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mySetsResult = await setService.getMySets();
      const mySetsData = mySetsResult?.data ?? (Array.isArray(mySetsResult) ? mySetsResult : []);
      setAllSets(mySetsData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách học phần. Vui lòng thử lại.');
      setAllSets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchAll);
  }, [fetchAll]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await setService.delete(deleteTarget.id);
      setAllSets((prev) => prev.filter((set) => set._id !== deleteTarget.id));
      toast.success('Xóa học phần thành công.');
      setDeleteTarget(null);
    } catch {
      toast.error('Xóa học phần thất bại.');
    } finally {
      setDeleting(false);
    }
  };

  const totalCardsCount = useMemo(() => {
    return allSets.reduce((sum, set) => sum + (set.cards?.length ?? set.cardCount ?? 0), 0);
  }, [allSets]);

  return (
    <div className="page-shell my-sets-page">
      <Container>
        {/* Premium welcome overview banner */}
        {!loading && allSets.length > 0 && (
          <div className="my-sets-dashboard-banner animate-fade-in">
            <div className="banner-glow-bubble" aria-hidden="true"></div>
            <div className="banner-left-info">
              <h2>Chào mừng trở lại, {user?.username || 'Học viên'}! 👋</h2>
              <p>Hôm nay bạn muốn củng cố thêm bao nhiêu từ vựng mới? Hãy ôn tập đều đặn để kích hoạt ghi nhớ dài hạn nhé!</p>
              <div className="banner-stats-row">
                <div className="banner-stat-item">
                  <FiBook className="stat-icon text-blue" />
                  <div className="stat-meta">
                    <span className="stat-value">{allSets.length}</span>
                    <span className="stat-label">Học phần</span>
                  </div>
                </div>
                <div className="banner-stat-item">
                  <span className="stat-emoji-icon">🎴</span>
                  <div className="stat-meta">
                    <span className="stat-value">{totalCardsCount}</span>
                    <span className="stat-label">Thuật ngữ</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="banner-right-illustration">
              <span className="illustration-icon">📚</span>
            </div>
          </div>
        )}

        <div className="my-sets-content">
          <main className="my-sets-main">
            {loading ? (
              <SkeletonPage cards={6} />
            ) : error ? (
              <div className="my-sets-error">
                <p>{error}</p>
                <button className="btn-glassline-primary" onClick={fetchAll}>
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {allSets.length === 0 && (
                  <div className="my-sets-empty">
                    <div className="my-sets-empty-icon">📚</div>
                    <h2>Bạn chưa có học phần flashcard nào</h2>
                    <p>Hãy tạo học phần đầu tiên để bắt đầu học và rèn luyện từ vựng tiếng Anh!</p>
                    <button
                      className="btn-glassline-primary"
                      onClick={() => navigate('/flashcards/sets/create')}
                    >
                      <FiPlus size={16} /> Tạo học phần đầu tiên
                    </button>
                  </div>
                )}

                {allSets.length > 0 && (
                  <div className="my-sets-grid">
                    {/* Integrated Dashed Creation Card */}
                    <div className="set-card-v2 create-card-dashed" onClick={() => navigate('/flashcards/sets/create')}>
                      {/* Stack deck layers with dashed borders */}
                      <div className="deck-shadow-layer layer-2" style={{ borderStyle: 'dashed' }}></div>
                      <div className="deck-shadow-layer layer-1" style={{ borderStyle: 'dashed' }}></div>
                      
                      <div className="set-card-content create-card-content-dashed">
                        <div className="plus-icon-circle">
                          <FiPlus size={20} />
                        </div>
                        <span className="create-card-text">Tạo học phần mới</span>
                      </div>
                    </div>

                    {allSets.map((set) => (
                      <SetCard
                        key={set._id}
                        set={set}
                        showActions={true}
                        onClick={() => navigate(`/flashcards/sets/${set._id}`)}
                        onEdit={() => navigate(`/flashcards/sets/${set._id}/edit`)}
                        onDelete={() => setDeleteTarget({ id: set._id, title: set.title })}
                      />
                    ))}
                  </div>
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
        title="Xóa học phần flashcard"
        message={`Bạn có chắc chắn muốn xóa học phần "${deleteTarget?.title}"? Hành động này sẽ xóa vĩnh viễn học phần và không thể khôi phục.`}
        confirmText="Xóa học phần"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
