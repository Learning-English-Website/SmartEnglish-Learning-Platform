/**
 * Type definitions for Study Modes
 */

// Card interface
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  imageUrl?: string;
  audioUrl?: string;
}

// Study mode types
export type LearnMode = 'multiple-choice' | 'type-answer';

// SM-2 Quality ratings
export type QualityRating = 0 | 1 | 2 | 3;

// Card status for progress tracking
export type CardStatus = 'new' | 'learning' | 'mastered';

// Card with schedule info
export interface CardWithSchedule extends Flashcard {
  schedule?: CardSchedule;
  status?: CardStatus;
}

// SM-2 Card Schedule
export interface CardSchedule {
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date;
  lapses: number;
}

// Learning item in the queue
export interface LearningItem {
  cardId: string;
  mode: LearnMode;
  card: Flashcard;
}

// Session state
export interface SessionState {
  sessionId: string;
  setId: string;
  isActive: boolean;
  startedAt: Date;
  completedAt?: Date;
  totalCards: number;
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  currentItem: LearningItem | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  selectedAnswer: string | null;
  typedAnswer: string;
  showHint: boolean;
}

// Session results
export interface SessionResults {
  sessionId: string;
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  durationMs: number;
  completedAt: Date;
}

// Settings
export interface StudySettings {
  soundEnabled: boolean;
  shuffleEnabled: boolean;
  showHint: boolean;
}

// Progress bar segment
export interface ProgressSegment {
  startIndex: number;
  endIndex: number;
  status: 'completed' | 'current' | 'upcoming';
  cardsInSegment: number;
}

// Study mode configuration
export interface StudyModeConfig {
  id: LearnMode;
  label: string;
  icon: string;
}

// Constants
export const CARD_BATCH_SIZE = 6; // Progress bar groups cards in batches of 6
export const QUALITY_LABELS: Record<QualityRating, string> = {
  0: 'Again',
  1: 'Hard',
  2: 'Good',
  3: 'Easy',
};

export const QUALITY_COLORS: Record<QualityRating, string> = {
  0: '#ef4444', // red
  1: '#f59e0b', // amber
  2: '#10b981', // green
  3: '#3b82f6', // blue
};
