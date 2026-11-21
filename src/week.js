// ISO 8601 week calculations, evaluated in the user's time zone.
//
// All arithmetic runs on UTC-midnight Date objects that stand for a *calendar day* in the user's zone,
// so the server's own clock zone never leaks in.

const DAY_MS = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function validTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

// The calendar day (as a UTC-midnight Date) that `instant` falls on in `timeZone`.
function localDay(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: validTimeZone(timeZone),
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instant);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

const isoWeekday = (day) => day.getUTCDay() || 7; // Mon=1 .. Sun=7
const addDays = (day, n) => new Date(day.getTime() + n * DAY_MS);

// ISO week and week-year of a calendar day. The week-year is the year of that week's Thursday,
// so Jan 1-3 can belong to the previous year's last week and Dec 29-31 to next year's week 1.
function isoWeekOfDay(day) {
  const thursday = addDays(day, 4 - isoWeekday(day));
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY_MS / 7) + 1;
  return { week, year };
}

// 52 or 53: Dec 28 is always in the last ISO week of its year.
function weeksInIsoYear(year) {
  return isoWeekOfDay(new Date(Date.UTC(year, 11, 28))).week;
}

function formatDay(day) {
  return `${MONTHS[day.getUTCMonth()]} ${day.getUTCDate()}`;
}

// Everything the layouts need about "this week", for `now` in `timeZone` (IANA name, falls back to UTC).
function weekInfo(now = new Date(), timeZone) {
  const today = localDay(now, timeZone);
  const { week, year } = isoWeekOfDay(today);
  const weekday = isoWeekday(today);
  const monday = addDays(today, 1 - weekday);
  const sunday = addDays(monday, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i).getUTCDate());
  return {
    week,
    year,
    weeksInYear: weeksInIsoYear(year),
    weekday, // 1..7
    days, // day-of-month for Mon..Sun
    monday: formatDay(monday),
    sunday: formatDay(sunday),
    timeZone: validTimeZone(timeZone),
  };
}

module.exports = { weekInfo, isoWeekOfDay, weeksInIsoYear, localDay, validTimeZone };
