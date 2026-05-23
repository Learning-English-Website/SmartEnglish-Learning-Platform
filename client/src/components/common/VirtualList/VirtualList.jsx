import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './VirtualList.css';

/**
 * VirtualList - Windowed list for rendering large datasets efficiently
 * Uses Intersection Observer for lazy loading without react-window dependency
 */
export function VirtualList({
  items,
  renderItem,
  itemHeight,
  overscan = 3,
  className = '',
  onLoadMore,
  hasMore = false,
  loading = false,
}) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate visible range based on scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = window.scrollY - containerRef.current.offsetTop;
    const viewportHeight = window.innerHeight;

    if (itemHeight) {
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(viewportHeight / itemHeight);
      const end = Math.min(items.length, start + visibleCount + overscan * 2);

      setVisibleRange({ start, end });

      // Check for load more
      if (hasMore && !loading && end >= items.length - 5) {
        onLoadMore?.();
      }
    }
  }, [items.length, itemHeight, overscan, hasMore, loading, onLoadMore]);

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Render visible items
  const visibleItems = itemHeight
    ? items.slice(visibleRange.start, visibleRange.end)
    : items;

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      style={{
        height: itemHeight ? `${items.length * itemHeight}px` : 'auto',
        position: 'relative',
      }}
    >
      {itemHeight ? (
        // Fixed height items
        <div
          style={{
            position: 'absolute',
            top: visibleRange.start * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <motion.div
              key={`item-${visibleRange.start + index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.2) }}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.start + index)}
            </motion.div>
          ))}
        </div>
      ) : (
        // Dynamic height items
        <>
          {visibleItems.map((item, index) => (
            <motion.div
              key={`item-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.2) }}
            >
              {renderItem(item, index)}
            </motion.div>
          ))}
        </>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="virtual-list__loading">
          <div className="virtual-list__spinner" />
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
}

/**
 * VirtualGrid - Windowed grid for card collections
 */
export function VirtualGrid({
  items,
  renderItem,
  columnCount = 4,
  gap = 16,
  className = '',
}) {
  const containerRef = useRef(null);
  const [visibleItems, setVisibleItems] = useState([]);
  const [itemHeight, setItemHeight] = useState(200);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            if (!visibleItems.includes(index)) {
              setVisibleItems((prev) => [...prev, index]);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const cards = containerRef.current.querySelectorAll('.virtual-grid__item');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [items.length, columnCount]);

  return (
    <div
      ref={containerRef}
      className={`virtual-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {items.map((item, index) => (
        <div
          key={`grid-item-${index}`}
          data-index={index}
          className="virtual-grid__item"
        >
          {visibleItems.includes(index) ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min((index % columnCount) * 0.05, 0.3) }}
            >
              {renderItem(item, index)}
            </motion.div>
          ) : (
            <div
              className="virtual-grid__placeholder"
              style={{ height: itemHeight }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default VirtualList;
