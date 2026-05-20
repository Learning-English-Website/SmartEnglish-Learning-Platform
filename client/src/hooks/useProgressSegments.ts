/**
 * useProgressSegments
 *
 * Calculates segment data for a Quizlet-style progress bar.
 * Segments auto-adjust based on total card count to keep the UI clean.
 *
 * Algorithm:
 *   segments       = clamp(5, 9, ceil(totalCards / 3))
 *   cardsPerSeg    = ceil(totalCards / segments)
 *   filledSegments = floor(progress * segments)
 *   activePercent  = partial fill within the current segment
 *
 * SR-ready: returns segment-level data so callers can later
 * annotate each segment with SRS state (new / learning / review / mastered).
 */

import { useMemo } from 'react';

export interface SegmentData {
  index: number;
  isFilled: boolean;     // completely filled
  isActive: boolean;     // segment currently being studied
  fillPercent: number;   // 0-1 for active segment's partial fill
  cardRange: [number, number]; // 0-based [start, end) card indices covered
}

export interface ProgressSegmentsResult {
  /** Number of visual segments */
  totalSegments: number;
  /** Cards per segment (last segment may be shorter) */
  cardsPerSegment: number;
  /** Global progress 0-1 */
  progress: number;
  /** Number of fully filled segments */
  filledSegments: number;
  /** Index of the currently active segment (or -1 if done) */
  activeSegment: number;
  /** Fill within the active segment: 0-1 */
  activeFillPercent: number;
  /** Per-segment data array */
  segments: SegmentData[];
  /** 1-based display number in the active segment */
  activeSegmentNumber: number;
  /** Global item number (1-based) being studied */
  globalItemNumber: number;
}

export interface UseProgressSegmentsOptions {
  totalCards: number;
  learnedCards: number;
  /** Current 0-based card index in the session */
  currentIndex: number;
  /** Minimum segments (default 5) */
  minSegments?: number;
  /** Maximum segments (default 9) */
  maxSegments?: number;
  /** Cards per segment divisor (default 3) */
  divisor?: number;
}

const clamp = (min: number, max: number, val: number) =>
  Math.max(min, Math.min(max, val));

const ROUND_UP = (n: number) => Math.ceil(n);

export function useProgressSegments(
  options: UseProgressSegmentsOptions
): ProgressSegmentsResult {
  const {
    totalCards,
    learnedCards,
    currentIndex,
    minSegments = 5,
    maxSegments = 9,
    divisor = 3,
  } = options;

  return useMemo(() => {
    if (totalCards <= 0 || learnedCards < 0) {
      return buildEmpty(minSegments);
    }

    const totalSegments = clamp(
      minSegments,
      maxSegments,
      ROUND_UP(totalCards / divisor)
    );

    const cardsPerSegment = ROUND_UP(totalCards / totalSegments);

    const progress = Math.min(learnedCards / totalCards, 1);
    const filledSegments = Math.floor(progress * totalSegments);

    const activeSegment = learnedCards >= totalCards ? -1 : filledSegments;

    const cardsInActive = Math.min(
      totalCards - filledSegments * cardsPerSegment,
      cardsPerSegment
    );
    const positionInActive =
      activeSegment === -1
        ? cardsInActive
        : learnedCards - filledSegments * cardsPerSegment;

    const activeFillPercent =
      cardsInActive > 0 ? positionInActive / cardsInActive : 1;

    const segments: SegmentData[] = Array.from(
      { length: totalSegments },
      (_, i) => {
        const start = i * cardsPerSegment;
        const end = Math.min(start + cardsPerSegment, totalCards);
        const isFilled = i < filledSegments;
        const isActive = i === activeSegment;
        return {
          index: i,
          isFilled,
          isActive,
          fillPercent: isActive ? activeFillPercent : isFilled ? 1 : 0,
          cardRange: [start, end] as [number, number],
        };
      }
    );

    const activeSegmentNumber =
      activeSegment === -1 ? totalSegments : activeSegment + 1;

    const globalItemNumber = Math.min(currentIndex + 1, totalCards);

    return {
      totalSegments,
      cardsPerSegment,
      progress,
      filledSegments,
      activeSegment,
      activeFillPercent,
      segments,
      activeSegmentNumber,
      globalItemNumber,
    };
  }, [totalCards, learnedCards, currentIndex, minSegments, maxSegments, divisor]);
}

function buildEmpty(minSegments: number): ProgressSegmentsResult {
  const segments: SegmentData[] = Array.from({ length: minSegments }, (_, i) => ({
    index: i,
    isFilled: false,
    isActive: i === 0,
    fillPercent: 0,
    cardRange: [0, 0] as [number, number],
  }));

  return {
    totalSegments: minSegments,
    cardsPerSegment: 1,
    progress: 0,
    filledSegments: 0,
    activeSegment: 0,
    activeFillPercent: 0,
    segments,
    activeSegmentNumber: 1,
    globalItemNumber: 0,
  };
}

export default useProgressSegments;
