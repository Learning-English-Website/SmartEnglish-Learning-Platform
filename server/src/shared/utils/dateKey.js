const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE || process.env.TZ || 'Asia/Ho_Chi_Minh';

function getDateKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  // Use ISO-like local date in a specific timezone: YYYY-MM-DD
  // Intl with en-CA reliably formats as YYYY-MM-DD.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

module.exports = { getDateKey, DEFAULT_TIME_ZONE };
