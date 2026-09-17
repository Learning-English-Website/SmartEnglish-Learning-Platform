/**
 * Utility functions for StudySetLearn batch progression and QuizletProgressBar
 */

/** Returns the actual number of items in a given batch (last batch may be smaller) */
export const getBatchSize = (batchIdx, totalItems, totalBatches) => {
  if (!totalBatches || totalBatches <= 0 || !totalItems || totalItems <= 0) return 0;
  const effectiveSize = Math.ceil(totalItems / totalBatches);
  const start = batchIdx * effectiveSize;
  return Math.min(effectiveSize, Math.max(0, totalItems - start));
};

/** Returns total items in all batches up to (but not including) batchIdx */
export const getBatchesOffset = (batchIdx, totalItems, totalBatches) =>
  Array.from({ length: Math.max(0, batchIdx) }, (_, idx) => getBatchSize(idx, totalItems, totalBatches))
    .reduce((sum, size) => sum + size, 0);

/** Computes batch item state for QuizletProgressBar safely without runtime exceptions */
export const computeBatchItemState = (batchIdx, { totalItems, totalBatches, currentBatchIndex, currentQueueIdx, batchProgress }) => {
  const actualBatchSize = getBatchSize(batchIdx, totalItems, totalBatches);
  const progress = batchProgress?.get ? (batchProgress.get(batchIdx) || { correct: 0 }) : (batchProgress?.[batchIdx] || { correct: 0 });
  const isCompleted = actualBatchSize > 0 && (progress?.correct || 0) >= actualBatchSize;
  const isCurrent = batchIdx === currentBatchIndex;
  const isFuture = batchIdx > currentBatchIndex;
  const puckPos = isCurrent && actualBatchSize > 0
    ? Math.min(1, Math.max(0, currentQueueIdx / actualBatchSize))
    : 0;
  return { actualBatchSize, progress, isCompleted, isCurrent, isFuture, puckPos };
};
