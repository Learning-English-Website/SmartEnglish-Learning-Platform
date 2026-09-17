import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBatchSize,
  getBatchesOffset,
  computeBatchItemState,
} from '../utils/learnProgress.js';

describe('StudySetLearn — Progress & Batch Logic', () => {
  describe('getBatchSize', () => {
    it('returns 0 when totalItems or totalBatches is 0 or negative', () => {
      assert.equal(getBatchSize(0, 0, 0), 0);
      assert.equal(getBatchSize(0, -5, 1), 0);
      assert.equal(getBatchSize(0, 10, -1), 0);
    });

    it('computes even batch sizes correctly', () => {
      // 14 items across 2 batches => effective size 7
      assert.equal(getBatchSize(0, 14, 2), 7);
      assert.equal(getBatchSize(1, 14, 2), 7);
      assert.equal(getBatchSize(2, 14, 2), 0);
    });

    it('handles last batch with smaller remainder', () => {
      // 10 items across 2 batches => effective size 5
      assert.equal(getBatchSize(0, 10, 2), 5);
      assert.equal(getBatchSize(1, 10, 2), 5);

      // 11 items across 2 batches => effective size 6
      assert.equal(getBatchSize(0, 11, 2), 6);
      assert.equal(getBatchSize(1, 11, 2), 5);
    });
  });

  describe('getBatchesOffset', () => {
    it('returns 0 for the first batch or negative index', () => {
      assert.equal(getBatchesOffset(0, 20, 3), 0);
      assert.equal(getBatchesOffset(-1, 20, 3), 0);
    });

    it('sums preceding batch sizes correctly', () => {
      // 15 items across 3 batches => effective size 5
      assert.equal(getBatchesOffset(1, 15, 3), 5);
      assert.equal(getBatchesOffset(2, 15, 3), 10);
    });
  });

  describe('computeBatchItemState (Regression for FINDING-MEMORIS-UX-001-01)', () => {
    it('does not throw when batchProgress is undefined or null', () => {
      const state = computeBatchItemState(0, {
        totalItems: 10,
        totalBatches: 2,
        currentBatchIndex: 0,
        currentQueueIdx: 2,
        batchProgress: undefined,
      });

      assert.equal(state.isCompleted, false);
      assert.equal(state.isCurrent, true);
      assert.equal(state.isFuture, false);
      assert.equal(state.puckPos, 2 / 5);
      assert.deepEqual(state.progress, { correct: 0 });
    });

    it('safely handles batchProgress from a Map', () => {
      const map = new Map();
      map.set(0, { correct: 5 });

      const stateBatch0 = computeBatchItemState(0, {
        totalItems: 10,
        totalBatches: 2,
        currentBatchIndex: 1,
        currentQueueIdx: 1,
        batchProgress: map,
      });

      assert.equal(stateBatch0.isCompleted, true);
      assert.equal(stateBatch0.isCurrent, false);
      assert.equal(stateBatch0.isFuture, false);

      const stateBatch1 = computeBatchItemState(1, {
        totalItems: 10,
        totalBatches: 2,
        currentBatchIndex: 1,
        currentQueueIdx: 2,
        batchProgress: map,
      });

      assert.equal(stateBatch1.isCompleted, false);
      assert.equal(stateBatch1.isCurrent, true);
      assert.equal(stateBatch1.isFuture, false);
      assert.equal(stateBatch1.puckPos, 2 / 5);
    });

    it('clamps puckPos between 0 and 1', () => {
      const stateOver = computeBatchItemState(0, {
        totalItems: 5,
        totalBatches: 1,
        currentBatchIndex: 0,
        currentQueueIdx: 10, // larger than batch size 5
        batchProgress: null,
      });
      assert.equal(stateOver.puckPos, 1);

      const stateNegative = computeBatchItemState(0, {
        totalItems: 5,
        totalBatches: 1,
        currentBatchIndex: 0,
        currentQueueIdx: -3,
        batchProgress: null,
      });
      assert.equal(stateNegative.puckPos, 0);
    });
  });
});
