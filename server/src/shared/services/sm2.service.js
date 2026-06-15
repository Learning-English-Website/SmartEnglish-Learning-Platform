const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

function getNextReviewDate(intervalDays) {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() + 7);
  date.setUTCDate(date.getUTCDate() + intervalDays);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCHours(date.getUTCHours() - 7);
  return date;
}

function calculateSM2(currentSchedule, quality) {
  const now = new Date();
  let {
    easeFactor = INITIAL_EASE_FACTOR,
    interval = 0,
    repetitions = 0,
    lapses = 0,
  } = currentSchedule || {};
  let status = 'LEARNING';

  if (quality === 0) {
    repetitions = 0;
    interval = 1;
    lapses += 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.8);
  } else if (quality >= 3) {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    const qChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + qChange);
    status = repetitions >= 3 ? 'REVIEW' : 'LEARNING';
  }

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview: getNextReviewDate(interval),
    lastReview: now,
    status,
    lapses,
  };
}

module.exports = {
  INITIAL_EASE_FACTOR,
  MIN_EASE_FACTOR,
  calculateSM2,
  getNextReviewDate,
};
