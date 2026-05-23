import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import './Skeleton.css';

/**
 * Skeleton - Loading placeholder with shimmer animation
 */
export function Skeleton({ width, height, borderRadius = 8, className = '', variant = 'text' }) {
  const prefersReducedMotion = useReducedMotion();

  const getDimensions = () => {
    switch (variant) {
      case 'circular':
        return { width: width || 40, height: height || 40, borderRadius: '50%' };
      case 'rectangular':
        return { width: width || '100%', height: height || 100, borderRadius };
      case 'card':
        return { width: width || '100%', height: height || 150, borderRadius };
      default:
        return { width: width || '100%', height: height || 16, borderRadius };
    }
  };

  const dimensions = getDimensions();

  if (prefersReducedMotion) {
    return (
      <div
        className={`skeleton ${className}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.borderRadius,
        }}
      />
    );
  }

  return (
    <motion.div
      className={`skeleton ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: dimensions.borderRadius,
      }}
      animate={{
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/**
 * SkeletonText - Multiple lines of text skeleton
 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '70%' : '100%'}
          borderRadius={4}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Card skeleton placeholder
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <Skeleton variant="card" height={180} />
      <div className="skeleton-card__content">
        <Skeleton height={20} width="80%" borderRadius={4} />
        <SkeletonText lines={2} />
      </div>
      <div className="skeleton-card__footer">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton height={14} width={100} borderRadius={4} />
      </div>
    </div>
  );
}

/**
 * SkeletonList - List of skeleton cards
 */
export function SkeletonList({ count = 4, className = '' }) {
  return (
    <div className={`skeleton-list ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * SkeletonPage - Full page skeleton with header, tabs, and grid
 */
export function SkeletonPage({ className = '' }) {
  return (
    <div className={`skeleton-page ${className}`}>
      <Skeleton variant="page-title" />
      <div className="skeleton-tabs">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} width={80} height={32} borderRadius={6} />
        ))}
      </div>
      <div className="skeleton-page__grid">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonGrid - Grid of skeleton cards
 */
export function SkeletonGrid({ count = 6, className = '' }) {
  return (
    <div className={`skeleton-grid ${className}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
