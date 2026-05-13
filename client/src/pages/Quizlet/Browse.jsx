import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Row, Col, Button, Spinner } from 'react-bootstrap';
import { FiSearch, FiX, FiGrid, FiList } from 'react-icons/fi';
import SetCard from '../../components/common/SetCard/SetCard';
import { setService } from '../../api/setService';
import useDebounce from '../../hooks/useDebounce';
import './Browse.css';

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTag = searchParams.get('tag') || '';

  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          search: debouncedSearch || initialTag,
          page,
          pageSize: 12,
        };
        const result = await setService.getPublicSets(params);
        if (page === 1) {
          setSets(result.data || result);
        } else {
          setSets((prev) => [...prev, ...(result.data || result)]);
        }
        setHasMore(result.pagination ? result.pagination.page < result.pagination.totalPages : false);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load sets');
        setSets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
  }, [debouncedSearch, page, initialTag]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, initialTag]);

  // Sync initial tag to search query
  useEffect(() => {
    if (initialTag && !searchQuery) {
      setSearchQuery(initialTag);
    }
  }, [initialTag]);

  const handleLoadMore = () => setPage((prev) => prev + 1);

  const clearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="browse-page">
      {/* Hero Section */}
      <div className="browse-hero">
        <div className="browse-hero-content">
          <h1 className="browse-hero-title">Discover Flashcard Sets</h1>
          <p className="browse-hero-subtitle">Explore thousands of public flashcard sets from our community</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="browse-container">
        {/* Search & Controls Row */}
        <div className="browse-controls">
          <div className="browse-search-wrapper">
            <FiSearch className="browse-search-icon" size={18} />
            <input
              type="text"
              className="browse-search-input"
              placeholder="Search sets by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="browse-search-clear" onClick={clearSearch}>
                <FiX size={16} />
              </button>
            )}
          </div>

          <div className="browse-actions">
            <button
              className={`browse-action-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <FiGrid size={18} />
            </button>
            <button
              className={`browse-action-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <FiList size={18} />
            </button>
          </div>
        </div>

        {/* Results Info */}
        {!loading && sets.length > 0 && (
          <div className="browse-results-info">
            <span className="browse-results-count">{sets.length} sets found</span>
          </div>
        )}

        {/* Loading State */}
        {loading && page === 1 && (
          <div className="browse-state browse-loading">
            <Spinner animation="border" variant="primary" />
            <p>Loading sets...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="browse-state browse-error">
            <p>{error}</p>
            <Button variant="primary" onClick={() => setPage(1)}>Try Again</Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sets.length === 0 && (
          <div className="browse-state browse-empty">
            <FiSearch size={48} className="browse-empty-icon" />
            <h3>No sets found</h3>
            <p>
              {initialTag
                ? `No public sets found with tag "${initialTag}".`
                : 'Try adjusting your search to find what you\'re looking for.'}
            </p>
            {(searchQuery || initialTag) && (
              <Button variant="primary" onClick={() => {
                setSearchQuery('');
                setSearchParams({});
              }}>
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* Results Grid */}
        {!loading && sets.length > 0 && (
          <>
            <Row className={`browse-grid ${viewMode === 'list' ? 'browse-grid--list' : ''}`}>
              {sets.map((set) => (
                <Col key={set._id} xs={12} sm={viewMode === 'list' ? 12 : 6} md={viewMode === 'list' ? 12 : 4} lg={viewMode === 'list' ? 12 : 3}>
                  <SetCard set={set} showActions={false} />
                </Col>
              ))}
            </Row>

            {hasMore && (
              <div className="browse-load-more">
                <Button variant="outline-primary" onClick={handleLoadMore} disabled={loading}>
                  Load More Sets
                </Button>
              </div>
            )}

            {loading && page > 1 && (
              <div className="browse-loading-more">
                <Spinner animation="border" size="sm" variant="primary" />
                <span>Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
