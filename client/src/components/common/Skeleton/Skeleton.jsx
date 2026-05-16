import './Skeleton.css';

/**
 * Skeleton - animated loading placeholders
 */
export default function Skeleton({ variant = 'text', width, height, className = '' }) {
  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard - skeleton for set cards
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__header">
        <Skeleton variant="title" />
        <Skeleton variant="badge" />
      </div>
      <Skeleton variant="text" />
      <div className="skeleton-card__tags">
        <Skeleton variant="tag" />
        <Skeleton variant="tag" />
      </div>
      <div className="skeleton-card__footer">
        <Skeleton variant="meta" />
        <Skeleton variant="actions" />
      </div>
    </div>
  );
}

/**
 * SkeletonList - skeleton for list items
 */
export function SkeletonList({ count = 5 }) {
  return (
    <div className="skeleton-list" aria-label="Loading items...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list__item">
          <Skeleton variant="text" />
          <Skeleton variant="meta" />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonPage - full page skeleton
 */
export function SkeletonPage({ title = true, cards = 6 }) {
  return (
    <div className="skeleton-page" aria-label="Loading page...">
      {title && <Skeleton variant="page-title" />}
      <div className="skeleton-page__grid">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
