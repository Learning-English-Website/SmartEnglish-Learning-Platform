import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Globe, Lock, Brain } from 'lucide-react';
import { setService } from '../../api/setService';
import './ExploreSets.css';

export default function ExploreSets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [filteredSets, setFilteredSets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTag, setSelectedTag] = useState('all');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const setsPerPage = 6;

  const tagDropdownRef = useRef(null);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      try {
        const res = await setService.getPublicSets();
        const allSets = res?.data ?? res ?? [];
        // Filter to only public sets
        const publicSets = allSets.filter(s => s.isPublic);
        setSets(publicSets);
        setFilteredSets(publicSets);
      } catch (err) {
        console.error('Failed to fetch sets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, []);

  // Extract unique tags from loaded sets
  const allUniqueTags = useMemo(() => {
    const tagMap = new Map();
    sets.forEach(s => {
      if (s.tagObjects && Array.isArray(s.tagObjects)) {
        s.tagObjects.forEach(t => {
          if (t && t._id && t.name) {
            tagMap.set(t._id, t);
          }
        });
      }
    });
    return Array.from(tagMap.values());
  }, [sets]);

  // Click outside to close tag dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setIsTagDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTagObj = useMemo(() => {
    return allUniqueTags.find(t => t._id === selectedTag);
  }, [allUniqueTags, selectedTag]);

  const filteredTagsInDropdown = useMemo(() => {
    if (!tagSearchQuery.trim()) return allUniqueTags;
    const query = tagSearchQuery.toLowerCase();
    return allUniqueTags.filter(t => t.name.toLowerCase().includes(query));
  }, [allUniqueTags, tagSearchQuery]);

  useEffect(() => {
    let result = [...sets];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    // 2. Tag Filter
    if (selectedTag !== 'all') {
      result = result.filter(s =>
        s.tags && s.tags.includes(selectedTag)
      );
    }

    // 3. Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'most_cards') {
      result.sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0));
    } else if (sortBy === 'least_cards') {
      result.sort((a, b) => (a.cardCount || 0) - (b.cardCount || 0));
    } else if (sortBy === 'az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    setFilteredSets(result);
    setCurrentPage(1);
  }, [searchQuery, sets, sortBy, selectedTag]);

  const totalPages = Math.ceil(filteredSets.length / setsPerPage);
  const indexOfLastSet = currentPage * setsPerPage;
  const indexOfFirstSet = indexOfLastSet - setsPerPage;
  const currentSets = filteredSets.slice(indexOfFirstSet, indexOfLastSet);

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1 className="explore-title">Khám phá học phần</h1>
        <p className="explore-subtitle">Tìm kiếm và học các học phần công khai từ cộng đồng</p>
      </div>

      <div className="explore-search">
        <Search size={18} className="explore-search-icon" />
        <input
          type="text"
          placeholder="Tìm kiếm học phần..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="explore-search-input"
        />
      </div>

      {/* Filter Bar */}
      <div className="explore-filter-bar">
        <div className="explore-results-count">
          Tìm thấy <strong>{filteredSets.length}</strong> học phần
        </div>
        <div className="explore-filter-actions">
          {/* Searchable Tag Filter */}
          {allUniqueTags.length > 0 && (
            <div className="explore-filter-group explore-tag-filter-container" ref={tagDropdownRef}>
              <span className="explore-filter-label">Thẻ:</span>
              <div
                className="explore-tag-dropdown-trigger"
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              >
                {selectedTag === 'all' ? (
                  'Tất cả'
                ) : (
                  <span
                    className="explore-selected-tag-pill"
                    style={{
                      color: selectedTagObj?.color || 'var(--gl-tertiary)',
                      backgroundColor: selectedTagObj?.color ? `${selectedTagObj.color}15` : 'rgba(44, 94, 245, 0.08)',
                      borderColor: selectedTagObj?.color ? `${selectedTagObj.color}30` : 'rgba(44, 94, 245, 0.15)'
                    }}
                  >
                    {selectedTagObj?.name}
                  </span>
                )}
                <span className="explore-dropdown-arrow" style={{ transform: isTagDropdownOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>

              {isTagDropdownOpen && (
                <div className="explore-tag-dropdown-menu">
                  <input
                    type="text"
                    placeholder="Tìm thẻ..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="explore-tag-dropdown-search"
                    autoFocus
                  />
                  <div className="explore-tag-dropdown-list">
                    <div
                      className={`explore-tag-dropdown-item ${selectedTag === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTag('all');
                        setIsTagDropdownOpen(false);
                        setTagSearchQuery('');
                      }}
                    >
                      Tất cả thẻ
                    </div>
                    {filteredTagsInDropdown.map(t => (
                      <div
                        key={t._id}
                        className={`explore-tag-dropdown-item ${selectedTag === t._id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTag(t._id);
                          setIsTagDropdownOpen(false);
                          setTagSearchQuery('');
                        }}
                      >
                        <span
                          className="explore-tag-dot"
                          style={{ backgroundColor: t.color || 'var(--gl-tertiary)' }}
                        />
                        {t.name}
                      </div>
                    ))}
                    {filteredTagsInDropdown.length === 0 && (
                      <div className="explore-tag-dropdown-empty">Không tìm thấy thẻ</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sort By */}
          <div className="explore-filter-group">
            <span className="explore-filter-label">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="explore-filter-select"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="most_cards">Nhiều thẻ nhất</option>
              <option value="least_cards">Ít thẻ nhất</option>
              <option value="az">Tên A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="explore-loading">
          <div className="explore-spinner"></div>
          <span>Đang tải...</span>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="explore-empty">
          <BookOpen size={48} />
          <p>Không tìm thấy học phần nào</p>
        </div>
      ) : (
        <>
          <div className="explore-grid">
            {currentSets.map((set) => (
              <Link
                key={set._id}
                to={`/flashcards/sets/${set._id}`}
                className="explore-card"
              >
                <div className="explore-card-header">
                  <div className="explore-card-user">
                    <div className="explore-user-avatar">
                      {set.user?.username ? set.user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="explore-user-name">{set.user?.username || 'User'}</span>
                  </div>
                  <span className="explore-card-visibility public">
                    <Globe size={12} />
                  </span>
                </div>

                <h3 className="explore-card-title">{set.title}</h3>

                {set.tagObjects && set.tagObjects.length > 0 && (
                  <div className="explore-card-tags">
                    {set.tagObjects.map(t => (
                      <span
                        key={t._id}
                        className="explore-tag-pill"
                        style={{
                          color: t.color || 'var(--gl-tertiary)',
                          backgroundColor: t.color ? `${t.color}10` : 'rgba(44, 94, 245, 0.06)',
                          borderColor: t.color ? `${t.color}25` : 'rgba(44, 94, 245, 0.12)'
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}

                {set.description && (
                  <p className="explore-card-desc">{set.description}</p>
                )}

                <div className="explore-card-footer">
                  <span className="explore-card-meta">
                    <BookOpen size={14} />
                    {set.cardCount || 0} thuật ngữ
                  </span>
                  <button className="explore-card-study">
                    <Brain size={14} />
                    Học
                  </button>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="explore-pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="explore-pag-btn"
                aria-label="Trang trước"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`explore-pag-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="explore-pag-btn"
                aria-label="Trang sau"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
