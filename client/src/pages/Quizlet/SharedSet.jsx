import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FiArrowLeft, FiPlay, FiCopy, FiBookmark, FiPlus, FiGlobe, FiLock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';
import { shareService } from '../../api/shareService';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import FlashcardViewer from '../../components/flashcard/FlashcardViewer/FlashcardViewer';
import { LoadingSpinner } from '../../components/common';
import './SharedSet.css';

export default function SharedSet() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToMySets, setAddingToMySets] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate(`/login?redirect=/shared/${shareCode}`, { replace: true });
      return;
    }

    const fetchSharedSet = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await shareService.getByLink(shareCode);
        const shareData = res?.data ?? res;
        if (!shareData || !shareData.set) {
          setError('This shared set could not be found or is no longer available.');
          setLoading(false);
          return;
        }
        setSet(shareData.set);

        if (shareData.set._id) {
          const cardsRes = await cardService.getBySetId(shareData.set._id);
          const cardsData = cardsRes?.data ?? cardsRes;
          setCards(Array.isArray(cardsData) ? cardsData : []);
        }
      } catch (err) {
        console.error(err);
        setError('This shared set could not be found or is no longer available.');
      } finally {
        setLoading(false);
      }
    };

    if (shareCode) {
      fetchSharedSet();
    }
  }, [isAuthenticated, authLoading, navigate, shareCode]);

  const handleAddToMySets = async () => {
    if (!set) return;
    setAddingToMySets(true);
    try {
      const res = await setService.create({
        title: `${set.title} (Copy)`,
        description: set.description,
        language: set.language,
        isPublic: false,
        tags: set.tags || [],
      });
      const newSet = res?.data ?? res;

      if (newSet?._id && cards.length > 0) {
        await cardService.bulkCreate(
          newSet._id,
          cards.map((c) => ({
            front: c.front,
            back: c.back,
            pronunciation: c.pronunciation,
            example: c.example,
            note: c.note,
          }))
        );
      }

      toast.success('Added to your sets!');
      navigate(`/flashcards/sets/${newSet._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add to your sets');
    } finally {
      setAddingToMySets(false);
    }
  };

  const handleBookmark = async () => {
    if (!set) return;
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await shareService.unbookmark(set._id);
        setIsBookmarked(false);
        toast.success('Removed from bookmarks');
      } else {
        await shareService.bookmark(set._id);
        setIsBookmarked(true);
        toast.success('Added to bookmarks');
      }
    } catch (err) {
      toast.error('Failed to update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page-shell shared-set-page">
        <Container>
          <LoadingSpinner text="Loading shared set..." />
        </Container>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="page-shell shared-set-page">
        <Container>
          <div className="shared-set-error">
            <div className="shared-set-error-icon">🔗</div>
            <h2>Shared Set Not Found</h2>
            <p>{error || 'This link may be invalid or expired.'}</p>
            <button className="btn-glassline-primary" onClick={() => navigate('/flashcards/browse')}>
              <FiGlobe size={14} /> Browse Public Sets
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-shell shared-set-page">
      <Container>
        <button className="shared-set-back" onClick={() => navigate('/flashcards/browse')}>
          <FiArrowLeft size={16} /> Browse Public Sets
        </button>

        <div className="shared-set-header surface-card">
          <div className="shared-set-header-main">
            <div className="shared-set-visibility">
              {set.isPublic ? (
                <span className="shared-set-visibility-badge public">
                  <FiGlobe size={12} /> Public
                </span>
              ) : (
                <span className="shared-set-visibility-badge private">
                  <FiLock size={12} /> Private
                </span>
              )}
            </div>
            <h1 className="shared-set-title">{set.title}</h1>
            {set.description && (
              <p className="shared-set-description">{set.description}</p>
            )}
            <div className="shared-set-meta">
              <span className="shared-set-meta-item">
                {cards.length} cards
              </span>
              {set.language && (
                <span className="shared-set-meta-item">
                  {set.language}
                </span>
              )}
              {set.user?.username && (
                <span className="shared-set-meta-item">
                  by {set.user.username}
                </span>
              )}
            </div>
          </div>

          <div className="shared-set-header-actions">
            <button
              className={`shared-set-action-btn ${isBookmarked ? 'active' : ''}`}
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
            >
              {isBookmarked ? <FiBookmark size={16} /> : <FiPlus size={16} />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button
              className="btn-glassline-outline"
              onClick={handleAddToMySets}
              disabled={addingToMySets}
            >
              {addingToMySets ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <FiCopy size={14} /> Add to My Sets
                </>
              )}
            </button>
            <button
              className="btn-glassline-primary"
              onClick={() => navigate(`/flashcards/sets/${set._id}/study`)}
            >
              <FiPlay size={14} /> Study This Set
            </button>
          </div>
        </div>

        <div className="shared-set-cards">
          <h2 className="shared-set-cards-title">Flashcards</h2>
          {cards.length > 0 ? (
            <FlashcardViewer cards={cards} />
          ) : (
            <div className="shared-set-empty-cards">
              <p>This set has no cards yet.</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
