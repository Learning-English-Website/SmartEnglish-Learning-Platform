/**
 * QuizletProgressSegments
 *
 * A Quizlet-style animated segment progress bar for flashcard study sessions.
 * Auto-adjusts segment count based on total cards (5-9 segments).
 *
 * Features:
 * - Smooth fill animation with Framer Motion
 * - Circular puck showing current item number
 * - CSS transitions for fill, color, and shadow
 * - Mobile responsive
 * - SR-ready: accepts per-segment state for future spaced-repetition features
 */

import { motion } from 'framer-motion';
import { useProgressSegments, type SegmentData } from '../../../hooks/useProgressSegments';
import './ProgressSegments.css';

export interface QuizletProgressSegmentsProps {
  totalCards: number;
  learnedCards: number;
  currentIndex: number;
  className?: string;
  /** Override segment height (default 16px) */
  height?: number;
  /** Override total badge width (default 36px) */
  badgeSize?: number;
  /** Override gap between segments (default 4px) */
  gap?: number;
  /**
   * Optional per-segment metadata for SR mode.
   * When provided, segments render with SR-aware colors:
   *   mastered → #18AE79 (green)
   *   learning → #58a9f7 (blue)
   *   new      → #F7A23A (orange)
   */
  segmentStates?: Array<'new' | 'learning' | 'mastered'>;
}

const SEGMENT_HEIGHT = 16;
const PUCK_SIZE = 28;
const TRACK_VERTICAL_PADDING = 2;
const FILLED_COLOR = '#18AE79';
const ACTIVE_GRADIENT = 'linear-gradient(to right, #18AE79 0%, #58a9f7 100%)';
const GRAY_COLOR = '#9CA3AF';

export function QuizletProgressSegments({
  totalCards,
  learnedCards,
  currentIndex,
  className = '',
  height = SEGMENT_HEIGHT,
  badgeSize = 36,
  gap = 4,
  segmentStates,
}: QuizletProgressSegmentsProps) {
  const {
    totalSegments,
    filledSegments,
    activeSegment,
    activeFillPercent,
    segments,
    globalItemNumber,
  } = useProgressSegments({
    totalCards,
    learnedCards,
    currentIndex,
  });

  const trackHeight = height;

  return (
    <div
      className={`qps ${className}`}
      style={containerStyle(trackHeight, badgeSize, gap)}
      role="progressbar"
      aria-valuenow={globalItemNumber}
      aria-valuemax={totalCards}
    >
      {/* Segmented track */}
      <div className="qps__track" style={trackStyle(gap, trackHeight)}>
        {segments.map((seg, i) => (
          <SegmentBar
            key={seg.index}
            segment={seg}
            isLast={i === segments.length - 1}
            height={trackHeight}
            segmentState={segmentStates?.[seg.index]}
            isCurrentActiveSegment={seg.index === activeSegment}
            activeFillPercent={activeFillPercent}
            puckSize={PUCK_SIZE}
          />
        ))}
      </div>

      {/* Total badge */}
      <div className="qps__badge" style={badgeStyle(badgeSize)}>
        {totalCards}
      </div>
    </div>
  );
}

// ─── Individual Segment Bar ────────────────────────────────────────────────

interface SegmentBarProps {
  segment: SegmentData;
  isLast: boolean;
  height: number;
  segmentState?: 'new' | 'learning' | 'mastered';
  isCurrentActiveSegment: boolean;
  activeFillPercent: number;
  puckSize: number;
}

function SegmentBar({
  segment,
  isLast,
  height,
  segmentState,
  isCurrentActiveSegment,
  activeFillPercent,
  puckSize,
}: SegmentBarProps) {
  const isCompleted = segment.isFilled;
  const isActive = segment.isActive;
  const isFuture = !isCompleted && !isActive;

  const fillPercent = segment.fillPercent; // 0-1

  const bgOpacity = isCompleted ? 0.45 : isActive ? 1 : isFuture ? 0.35 : 0.45;

  return (
    <div
      className={`qps__segment ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''}`}
      style={segmentStyle(height)}
    >
      {/* Background bar */}
      <div
        className="qps__segment-bg"
        style={{ opacity: bgOpacity, background: GRAY_COLOR }}
      />

      {/* Filled portion — animate width changes */}
      {(isCompleted || isActive) && (
        <motion.div
          className="qps__segment-fill"
          style={{
            background: isCompleted ? FILLED_COLOR : ACTIVE_GRADIENT,
            height,
            borderRadius: 999,
          }}
          animate={{ width: `${fillPercent * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      )}

      {/* Circular puck — only on active segment */}
      {isActive && (
        <motion.div
          className="qps__puck"
          style={puckStyle(PUCK_SIZE, activeFillPercent)}
          animate={{ left: `calc(${activeFillPercent * 100}% + ${PUCK_SIZE / 2}px)` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <span className="qps__puck-num">
            {segment.cardRange[0] + Math.round(activeFillPercent * (segment.cardRange[1] - segment.cardRange[0])) + 1}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

function containerStyle(trackHeight: number, badgeSize: number, gap: number) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: `${gap}px`,
    width: '100%',
    maxWidth: 960,
    height: Math.max(trackHeight, PUCK_SIZE) + TRACK_VERTICAL_PADDING * 2,
    padding: `${TRACK_VERTICAL_PADDING}px 0`,
  };
}

function trackStyle(gap: number, trackHeight: number) {
  return {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: `${gap}px`,
    height: trackHeight,
    overflow: 'visible',
    position: 'relative' as const,
    paddingTop: (PUCK_SIZE - trackHeight) / 2,
    paddingBottom: (PUCK_SIZE - trackHeight) / 2,
  };
}

function segmentStyle(height: number) {
  return {
    position: 'relative' as const,
    flex: 1,
    height,
    borderRadius: 999,
    overflow: 'visible',
    display: 'flex',
    alignItems: 'center',
  };
}

function puckStyle(size: number, fillPercent: number) {
  return {
    position: 'absolute' as const,
    left: `calc(${fillPercent * 100}% + ${size / 2}px)`,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: size,
    height: size,
    borderRadius: '50%',
    background: '#fff',
    border: '2.5px solid #58a9f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 3px rgba(88,169,247,0.25), 0 2px 8px rgba(0,0,0,0.18)',
    zIndex: 2,
    pointerEvents: 'none' as const,
  };
}

function badgeStyle(size: number) {
  return {
    minWidth: size,
    height: size,
    borderRadius: size / 2,
    background: 'var(--gray-100-gray-900, #f3f4f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--gray-600-gray-400, #6b7280)',
    padding: '0 10px',
    flexShrink: 0,
  };
}

export default QuizletProgressSegments;
