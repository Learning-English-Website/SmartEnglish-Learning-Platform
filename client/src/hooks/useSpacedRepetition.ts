/**
 * SM-2 Spaced Repetition Algorithm Hook
 *
 * Based on the SuperMemo 2 algorithm for spaced repetition scheduling.
 *
 * Quality ratings:
 * - 0 (Again): Complete blackout, wrong answer
 * - 1 (Hard): Correct but with difficulty
 * - 2 (Good): Correct with some hesitation
 * - 3 (Easy): Perfect recall
 */

export interface CardSchedule {
  cardId: string;
  easeFactor: number;      // 1.3 - 2.5 (default 2.5)
  interval: number;        // days until next review
  repetitions: number;     // number of successful reviews
  nextReview: Date;
  lastReview: Date;
  lapses: number;          // number of times card was forgotten
}

export interface SM2Quality {
  quality: 0 | 1 | 2 | 3;
  responseTime?: number;    // optional response time in ms
}

// Default schedule for a new card
export const getDefaultSchedule = (cardId: string): CardSchedule => ({
  cardId,
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReview: new Date(),
  lastReview: new Date(),
  lapses: 0,
});

/**
 * Calculate next review schedule using SM-2 algorithm
 *
 * The algorithm:
 * - If quality < 2 (wrong or hard), reset repetitions and interval
 * - If quality >= 2 (good or easy), increase interval based on ease factor
 * - Ease factor adjusts based on performance
 */
export const calculateNextReview = (
  current: CardSchedule,
  quality: SM2Quality['quality']
): CardSchedule => {
  const now = new Date();
  let { easeFactor, interval, repetitions, lapses } = current;

  // SM-2 Quality scale: 0-5 in original, we use 0-3
  // Map our 0-3 to SM-2's 0-5 scale
  const sm2Quality = quality * (5 / 3); // 0->0, 1->1.67, 2->3.33, 3->5

  if (quality < 2) {
    // Failed - reset to beginning
    repetitions = 0;
    interval = 1; // Review again tomorrow
    lapses += 1;

    // Decrease ease factor (min 1.3)
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      // interval = previous interval * ease factor
      interval = Math.round(interval * easeFactor);
    }

    repetitions += 1;

    // Adjust ease factor based on quality
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const efChange = 0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02);
    easeFactor = Math.max(1.3, easeFactor + efChange);
  }

  // Calculate next review date
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...current,
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReview: now,
    lapses,
  };
};

/**
 * Get cards that are due for review
 */
export const getDueCards = (
  schedules: CardSchedule[],
  options?: { maxCards?: number }
): CardSchedule[] => {
  const now = new Date();

  const dueCards = schedules
    .filter(schedule => new Date(schedule.nextReview) <= now)
    .sort((a, b) => {
      // Sort by: overdue first (oldest nextReview first), then by ease factor (harder cards first)
      const dateCompare = new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.easeFactor - b.easeFactor;
    });

  if (options?.maxCards) {
    return dueCards.slice(0, options.maxCards);
  }

  return dueCards;
};

/**
 * Get cards sorted for learning session
 * Each card appears twice: once for multiple choice, once for type answer
 * Failed cards are reinserted based on SM-2 scheduling
 */
export const getLearningOrder = (
  cards: Array<{ id: string; schedule?: CardSchedule }>,
  options?: { maxPerSession?: number }
): Array<{ cardId: string; mode: 'multiple-choice' | 'type-answer' }> => {
  const order: Array<{ cardId: string; mode: 'multiple-choice' | 'type-answer' }> = [];

  // Get cards with schedules, merge with defaults
  const cardsWithSchedules = cards.map(card => ({
    ...card,
    schedule: card.schedule || getDefaultSchedule(card.id),
  }));

  // Get due cards first (prioritized review)
  const dueCards = getDueCards(cardsWithSchedules.map(c => c.schedule));

  // Create a map for quick lookup
  const scheduleMap = new Map(cardsWithSchedules.map(c => [c.id, c.schedule]));

  // Add due cards first (these are cards that need review)
  for (const schedule of dueCards) {
    if (options?.maxPerSession && order.length >= options.maxPerSession) break;

    order.push({ cardId: schedule.cardId, mode: 'multiple-choice' });
    if (options?.maxPerSession && order.length >= options.maxPerSession) break;
    order.push({ cardId: schedule.cardId, mode: 'type-answer' });
  }

  // Get new cards (repetitions === 0) that haven't been added
  const newCards = cardsWithSchedules.filter(
    c => c.schedule.repetitions === 0 && !dueCards.find(d => d.cardId === c.id)
  );

  for (const card of newCards) {
    if (options?.maxPerSession && order.length >= options.maxPerSession) break;

    order.push({ cardId: card.id, mode: 'multiple-choice' });
    if (options?.maxPerSession && order.length >= options.maxPerSession) break;
    order.push({ cardId: card.id, mode: 'type-answer' });
  }

  // Add remaining cards that need more practice
  const remainingCards = cardsWithSchedules.filter(
    c => c.schedule.repetitions > 0 &&
      !dueCards.find(d => d.cardId === c.id) &&
      !newCards.find(n => n.id === c.id)
  );

  for (const card of remainingCards) {
    if (options?.maxPerSession && order.length >= options.maxPerSession) break;

    order.push({ cardId: card.id, mode: 'multiple-choice' });
    if (options?.maxPerSession && order.length >= options.maxPerSession) break;
    order.push({ cardId: card.id, mode: 'type-answer' });
  }

  return order;
};

/**
 * Custom hook for spaced repetition state management
 */
import { useState, useCallback, useMemo } from 'react';

export interface UseSpacedRepetitionOptions {
  onScheduleUpdate?: (cardId: string, schedule: CardSchedule) => void;
}

export interface UseSpacedRepetitionReturn {
  schedules: Map<string, CardSchedule>;
  getSchedule: (cardId: string) => CardSchedule | undefined;
  updateSchedule: (cardId: string, quality: SM2Quality['quality']) => CardSchedule;
  getDueCards: (maxCards?: number) => CardSchedule[];
  getLearningOrder: (cardIds: string[], maxPerSession?: number) => Array<{ cardId: string; mode: 'multiple-choice' | 'type-answer' }>;
  resetSchedule: (cardId: string) => void;
}

export function useSpacedRepetition(
  initialSchedules: Array<CardSchedule> = [],
  options?: UseSpacedRepetitionOptions
): UseSpacedRepetitionReturn {
  const [schedules, setSchedules] = useState<Map<string, CardSchedule>>(() => {
    const map = new Map<string, CardSchedule>();
    initialSchedules.forEach(schedule => {
      map.set(schedule.cardId, schedule);
    });
    return map;
  });

  const getSchedule = useCallback(
    (cardId: string): CardSchedule | undefined => {
      return schedules.get(cardId);
    },
    [schedules]
  );

  const updateSchedule = useCallback(
    (cardId: string, quality: SM2Quality['quality']): CardSchedule => {
      const current = schedules.get(cardId) || getDefaultSchedule(cardId);
      const newSchedule = calculateNextReview(current, quality);

      setSchedules(prev => {
        const next = new Map(prev);
        next.set(cardId, newSchedule);
        return next;
      });

      options?.onScheduleUpdate?.(cardId, newSchedule);
      return newSchedule;
    },
    [schedules, options]
  );

  const getDueCardsInternal = useCallback(
    (maxCards?: number): CardSchedule[] => {
      return getDueCards(Array.from(schedules.values()), { maxCards });
    },
    [schedules]
  );

  const getLearningOrderInternal = useCallback(
    (cardIds: string[], maxPerSession?: number) => {
      const cards = cardIds.map(id => ({
        id,
        schedule: schedules.get(id) || getDefaultSchedule(id),
      }));
      return getLearningOrder(cards, { maxPerSession });
    },
    [schedules]
  );

  const resetSchedule = useCallback((cardId: string) => {
    const defaultSchedule = getDefaultSchedule(cardId);
    setSchedules(prev => {
      const next = new Map(prev);
      next.set(cardId, defaultSchedule);
      return next;
    });
    options?.onScheduleUpdate?.(cardId, defaultSchedule);
  }, [options]);

  return {
    schedules,
    getSchedule,
    updateSchedule,
    getDueCards: getDueCardsInternal,
    getLearningOrder: getLearningOrderInternal,
    resetSchedule,
  };
}

export default useSpacedRepetition;
