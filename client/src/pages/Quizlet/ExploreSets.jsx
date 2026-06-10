import { useState, useEffect } from 'react';
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
        const res = await setService.getAll();
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSets(sets);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSets(
        sets.filter(s =>
          s.title?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, sets]);

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
        <div className="explore-grid">
          {filteredSets.map((set) => (
            <Link
              key={set._id}
              to={`/study-sets/${set._id}`}
              className="explore-card"
            >
              <div className="explore-card-header">
                <span className={`explore-card-visibility ${set.isPublic ? 'public' : 'private'}`}>
                  {set.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                </span>
              </div>
              <h3 className="explore-card-title">{set.title}</h3>
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
      )}
    </div>
  );
}
