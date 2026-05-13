import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiPlus,
  FiGlobe, FiLock, FiLayers, FiPlay,
  FiGrid, FiList, FiRefreshCw, FiBookOpen, FiCommand,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

import { setService }       from '../../api/setService';
import { cardService }      from '../../api/cardService';
import FlashcardViewer  from '../../components/flashcard/FlashcardViewer/FlashcardViewer';
import SortableCardRow  from '../../components/flashcard/SortableCardRow/SortableCardRow';
import { LoadingSpinner } from '../../components/common';
import './SetDetail.css';

const VIEW   = { CARDS: 'cards', STUDY: 'study' };
const LAYOUT = { LIST: 'list', GRID: 'grid' };

export default function CommunitySetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [set, setSet]         = useState(null);
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [view, setView]       = useState(VIEW.CARDS);
  const [layout, setLayout]   = useState(LAYOUT.LIST);

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  const fetchSet = useCallback(() => {
    setLoading(true);
    setService.getById(id)
      .then((res) => {
        const fetchedSet = res?.data ?? res;
        setSet(fetchedSet);
        // Redirect to editable personal view if user is the owner
        const currentUserId = currentUser?._id || currentUser?.id;
        const setUserId = fetchedSet?.user?._id || fetchedSet?.user?.id || fetchedSet?.user;
        if (currentUserId && setUserId && String(currentUserId) === String(setUserId)) {
          navigate(`/flashcards/sets/${id}`, { replace: true });
        }
      })
      .catch(() => setError('Could not load set.'))
      .finally(() => setLoading(false));
  }, [id, currentUser, navigate]);

  const fetchCards = useCallback(() => {
    setCardsLoading(true);
    cardService.getBySetId(id)
      .then((res) => {
        const data = res?.data ?? res;
        setCards(Array.isArray(data) ? data : []);
      })
      .catch(() => setCards([]))
      .finally(() => setCardsLoading(false));
  }, [id]);

  useEffect(() => { fetchSet(); fetchCards(); }, [fetchSet, fetchCards]);



  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="page-shell sd-loading-wrap">
      <LoadingSpinner text="Loading set..." />
    </div>
  );

  if (error || !set) return (
    <div className="page-shell sd-error-wrap">
      <p>{error ?? 'Set not found.'}</p>
      <button className="btn-glassline-primary" onClick={() => navigate('/flashcards')}>
        <FiArrowLeft size={14} /> Back
      </button>
    </div>
  );

  return (
    <div className="page-shell sd-page">
      <Container>

        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        <button className="sd-back" onClick={() => navigate('/flashcards')}>
          <FiArrowLeft size={16} /> Back
        </button>

        {/* ── Keyboard shortcut hints ───────────────────────────────── */}
        <div className="sd-shortcut-bar">
          <span className="sd-shortcut-item"><kbd>Esc</kbd> Cancel</span>
        </div>

        {/* ── Set Header ──────────────────────────────────────────────── */}
        <div className="sd-header surface-card">
          <div className="sd-header-main">
            <div className="sd-header-info">
              <div className="sd-header-title-row">
                <h1 className="sd-title">{set.title}</h1>
                <span className={`sd-visibility ${set.isPublic ? 'public' : 'private'}`}>
                  {set.isPublic ? <FiGlobe size={12} /> : <FiLock size={12} />}
                  {set.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              {set.description && <p className="sd-desc">{set.description}</p>}
              {set.tags?.length > 0 && (
                <div className="sd-tags">
                  {set.tags.map((tag) => (
                    <span key={tag} className="sd-tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="sd-meta">
                <span className="sd-meta-item">
                  <FiLayers size={14} />
                  <strong>{set.cardCount ?? cards.length}</strong> cards
                </span>
                {set.language && (
                  <span className="sd-meta-item sd-meta-lang">{set.language}</span>
                )}
              </div>
            </div>

            <div className="sd-header-actions">
              <button
                className={`sd-btn ${view === VIEW.STUDY ? 'sd-btn--primary' : 'sd-btn--outline'}`}
                onClick={() => setView(view === VIEW.STUDY ? VIEW.CARDS : VIEW.STUDY)}
                id="sd-study-btn"
                disabled={cards.length === 0}
              >
                <FiPlay size={15} />
                {view === VIEW.STUDY ? 'Back to Cards' : 'Study'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Study Mode ──────────────────────────────────────────────── */}
        {view === VIEW.STUDY && (
          <div className="sd-study-section">
            <FlashcardViewer cards={cards} />
          </div>
        )}

        {/* ── Cards Section ───────────────────────────────────────────── */}
        {view === VIEW.CARDS && (
          <div className="sd-cards-section">
            <div className="sd-cards-header">
              <h2>
                <FiBookOpen size={17} />
                Cards
                <span className="sd-cards-count">{cards.length}</span>
              </h2>
              <div className="sd-cards-header-right">
                <div className="sd-layout-toggle">
                  <button
                    className={`sd-layout-btn ${layout === LAYOUT.LIST ? 'active' : ''}`}
                    onClick={() => setLayout(LAYOUT.LIST)}
                    title="List view"
                  >
                    <FiList size={15} />
                  </button>
                  <button
                    className={`sd-layout-btn ${layout === LAYOUT.GRID ? 'active' : ''}`}
                    onClick={() => setLayout(LAYOUT.GRID)}
                    title="Grid view"
                  >
                    <FiGrid size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading / Empty */}
            {cardsLoading ? (
              <div className="sd-cards-loading">
                <LoadingSpinner text="Loading cards..." />
              </div>
            ) : cards.length === 0 ? (
              <div className="sd-cards-empty">
                <div className="sd-cards-empty-icon">🃏</div>
                <p>This community set has no cards.</p>
              </div>
            ) : layout === LAYOUT.LIST ? (

              /* ── LIST VIEW ── */
              <div className="sd-cards-list">
                {cards.map((card, idx) => (
                  <div key={card._id}>
                    <SortableCardRow
                      card={card}
                      index={idx + 1}
                      readonly={true}
                    />
                  </div>
                ))}
              </div>

            ) : (

              /* ── GRID VIEW ── */
              <div className="sd-cards-grid">
                {cards.map((card, idx) => (
                  <div key={card._id} className="sd-grid-card surface-card">
                    <div className="sd-grid-card-front">
                      <span className="sd-card-field-label">TERM</span>
                      <p className="sd-grid-word">{card.front}</p>
                      {card.pronunciation && (
                        <span className="sd-card-pronunciation">{card.pronunciation}</span>
                      )}
                    </div>
                    <div className="sd-grid-card-divider" />
                    <div className="sd-grid-card-back">
                      <span className="sd-card-field-label">DEFINITION</span>
                      <p className="sd-grid-def">{card.back}</p>
                    </div>
                    <div className="sd-grid-card-footer">
                      <span className="sd-grid-num">{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Container>

    </div>
  );
}
