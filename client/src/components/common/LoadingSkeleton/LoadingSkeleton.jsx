import { motion } from 'framer-motion';
import './LoadingSkeleton.css';

/**
 * Skeleton loading component for content placeholders
 */
export function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', className = '' }) {
  return (
    <motion.div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/**
 * Skeleton card for loading states
 */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="skeleton-card">
      <Skeleton width="40px" height="40px" borderRadius="50%" />
      <div className="skeleton-card-content">
        <Skeleton width="60%" height="24px" />
        <Skeleton width="40%" height="16px" />
        {lines > 2 && <Skeleton width="80%" height="16px" />}
      </div>
    </div>
  );
}

/**
 * Course card skeleton
 */
export function CourseCardSkeleton() {
  return (
    <div className="skeleton-course-card">
      <div className="skeleton-course-header">
        <Skeleton width="60px" height="60px" borderRadius="12px" />
        <Skeleton width="40px" height="40px" borderRadius="50%" />
      </div>
      <div className="skeleton-course-body">
        <Skeleton width="70%" height="24px" />
        <Skeleton width="50%" height="16px" />
        <Skeleton width="30%" height="14px" borderRadius="12px" />
      </div>
      <Skeleton width="100%" height="48px" borderRadius="16px" />
    </div>
  );
}

/**
 * Lesson skeleton
 */
export function LessonSkeleton() {
  return (
    <div className="skeleton-lesson">
      <Skeleton width="100%" height="80px" borderRadius="16px" />
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton({ type = 'default' }) {
  if (type === 'courses') {
    return (
      <div className="page-skeleton">
        <div className="skeleton-page-header">
          <Skeleton width="200px" height="40px" />
          <Skeleton width="150px" height="20px" />
        </div>
        <div className="skeleton-page-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'learn') {
    return (
      <div className="page-skeleton">
        <div className="skeleton-learn-header">
          <Skeleton width="100%" height="60px" borderRadius="12px" />
        </div>
        <div className="skeleton-units">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-unit">
              <Skeleton width="100%" height="120px" borderRadius="16px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'lesson') {
    return (
      <div className="page-skeleton lesson-skeleton">
        <div className="skeleton-lesson-header">
          <Skeleton width="60px" height="40px" borderRadius="20px" />
          <Skeleton width="100%" height="8px" borderRadius="4px" />
          <div className="skeleton-hearts">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width="28px" height="28px" borderRadius="50%" />
            ))}
          </div>
        </div>
        <div className="skeleton-lesson-content">
          <Skeleton width="100%" height="200px" borderRadius="16px" />
          <Skeleton width="100%" height="60px" borderRadius="16px" />
          <div className="skeleton-options">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height="80px" borderRadius="16px" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-skeleton">
      <Skeleton width="100%" height="200px" />
      <div className="skeleton-content">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height="100px" borderRadius="16px" />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
