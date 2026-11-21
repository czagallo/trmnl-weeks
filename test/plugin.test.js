const { test } = require('node:test');
const assert = require('node:assert/strict');
const { weekInfo, isoWeekOfDay, weeksInIsoYear } = require('../src/week');
const { renderAll, esc } = require('../src/markup');
const { app, trmnlMeta } = require('../server');

const day = (s) => new Date(`${s}T00:00:00Z`);

test('ISO week and week-year at year boundaries', () => {
  const cases = [
    ['2027-01-01', 53, 2026], // Fri: still week 53 of 2026 (was "Week 53 of 2027")
    ['2027-01-03', 53, 2026], // Sun
    ['2027-01-04', 1, 2027], // Mon
    ['2025-12-29', 1, 2026], // Mon: week 1 of 2026
    ['2025-12-30', 1, 2026], // was "Week 1 of 2025"
    ['2026-01-01', 1, 2026],
    ['2020-12-31', 53, 2020],
    ['2021-01-03', 53, 2020],
    ['2024-12-30', 1, 2025],
    ['2023-01-01', 52, 2022],
    ['2026-11-21', 47, 2026],
  ];
  for (const [d, week, year] of cases) assert.deepEqual(isoWeekOfDay(day(d)), { week, year }, d);
});

test('weeks per ISO year', () => {
  assert.equal(weeksInIsoYear(2020), 53);
  assert.equal(weeksInIsoYear(2026), 53);
  assert.equal(weeksInIsoYear(2025), 52);
  assert.equal(weeksInIsoYear(2027), 52);
});

test('weekInfo uses the user time zone, not the server clock zone', () => {
  // Sunday 2026-01-04 23:30 UTC is already Monday 2026-01-05 in Vienna (week 2) but still Sunday in UTC (week 1)
  const instant = new Date('2026-01-04T23:30:00Z');
  const utc = weekInfo(instant, 'UTC');
  assert.equal(utc.week, 1);
  assert.equal(utc.weekday, 7);
  assert.equal(utc.monday, 'Dec 29');
  assert.equal(utc.sunday, 'Jan 4');
  const vie = weekInfo(instant, 'Europe/Vienna');
  assert.equal(vie.week, 2);
  assert.equal(vie.weekday, 1);
  assert.equal(vie.monday, 'Jan 5');
  assert.equal(vie.sunday, 'Jan 11');

  // Monday 2027-01-04 03:00 UTC is still Sunday Jan 3 in Los Angeles: week 53 of 2026
  const la = weekInfo(new Date('2027-01-04T03:00:00Z'), 'America/Los_Angeles');
  assert.deepEqual([la.week, la.year, la.weeksInYear], [53, 2026, 53]);
  assert.deepEqual([la.monday, la.sunday], ['Dec 28', 'Jan 3']);
  assert.deepEqual(la.days, [28, 29, 30, 31, 1, 2, 3]);
});

test('missing or invalid time zone falls back to UTC', () => {
  const instant = new Date('2026-01-04T23:30:00Z');
  for (const tz of [undefined, '', 'Not/AZone', 42]) {
    const w = weekInfo(instant, tz);
    assert.equal(w.timeZone, 'UTC');
    assert.equal(w.week, 1);
  }
});

const LAYOUT_KEYS = ['markup', 'markup_half_horizontal', 'markup_half_vertical', 'markup_quadrant'];
const VIEW_CLASS = {
  markup: 'view--full',
  markup_half_horizontal: 'view--half_horizontal',
  markup_half_vertical: 'view--half_vertical',
  markup_quadrant: 'view--quadrant',
};

test('renderAll returns every layout, Liquid-safe, no hex colours, title_bar outside .layout', () => {
  const out = renderAll(weekInfo(new Date('2027-01-02T12:00:00Z'), 'UTC'), { baseUrl: 'https://x.example', instance: '{{ evil }} {% raw %}' });
  for (const k of LAYOUT_KEYS) {
    const m = out[k];
    assert.equal(typeof m, 'string');
    assert.match(m, new RegExp(`^<div class="view ${VIEW_CLASS[k]}">`));
    assert.doesNotMatch(m, /\{\{|\{%/, `${k} contains Liquid delimiters`);
    assert.doesNotMatch(m, /(?<!&)#[0-9a-f]{3,6}\b/i, `${k} contains a hex colour`);
    assert.doesNotMatch(m, /font-size:\s*\d+px/, `${k} has a fixed pixel font size`);
    // title_bar comes after .layout closes, as its sibling
    assert.match(m, /<\/div>\n<div class="title_bar">[\s\S]*<\/div>\n<\/div>$/);
    assert.ok(m.indexOf('class="layout"') < m.indexOf('class="title_bar"'));
    assert.match(m, />53</, `${k} shows the week`);
  }
  assert.match(out.markup, /of 2026/);
  assert.doesNotMatch(out.markup, /of 2027/);
  assert.equal(out.shared, '');
});

test('escaping', () => {
  assert.equal(esc(`<&"'>{}`), '&lt;&amp;&quot;&#39;&gt;&#123;&#125;');
  const out = renderAll(weekInfo(new Date(), 'UTC'), { baseUrl: '', instance: '"><script>x</script>' });
  for (const k of LAYOUT_KEYS) assert.doesNotMatch(out[k], /<script>|"><script/);
});

test('trmnlMeta accepts objects and JSON strings, ignores junk', () => {
  assert.deepEqual(trmnlMeta({ user: { time_zone_iana: 'UTC' } }), { user: { time_zone_iana: 'UTC' } });
  assert.deepEqual(trmnlMeta('{"user":{"time_zone_iana":"Asia/Tokyo"}}'), { user: { time_zone_iana: 'Asia/Tokyo' } });
  assert.deepEqual(trmnlMeta('not json'), {});
  assert.deepEqual(trmnlMeta(undefined), {});
});

// --- HTTP ----------------------------------------------------------------

async function withServer(fn) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

test('POST /markup works with form-encoded nested keys and with a JSON string', async () => {
  await withServer(async (base) => {
    const form = await fetch(`${base}/markup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'user_uuid=abc&trmnl[user][time_zone_iana]=Europe%2FVienna&trmnl[plugin_settings][instance_name]=Work',
    }).then((r) => r.json());
    for (const k of LAYOUT_KEYS) assert.match(form[k], new RegExp(VIEW_CLASS[k]));
    assert.match(form.markup, />Work</);

    const json = await fetch(`${base}/markup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trmnl: JSON.stringify({ user: { time_zone_iana: 'Asia/Tokyo' } }) }),
    }).then((r) => r.json());
    for (const k of LAYOUT_KEYS) assert.ok(json[k]);
  });
});

test('/install never echoes the query back', async () => {
  await withServer(async (base) => {
    const r = await fetch(`${base}/install?code=secret-code-123`);
    assert.equal(r.status, 400);
    assert.doesNotMatch(await r.text(), /secret-code-123/);
  });
});

test('/manage only links valid setting ids, and escapes nothing user-controlled into HTML', async () => {
  await withServer(async (base) => {
    const post = (body) =>
      fetch(`${base}/webhooks/install-success`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post({ user: { uuid: 'u-1', plugin_setting_id: '"><script>alert(1)</script>' } })).status, 200);
    let html = await fetch(`${base}/manage?uuid=u-1`).then((r) => r.text());
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /href="https:\/\/usetrmnl\.com"/);

    await post({ user: { uuid: 'u-2', plugin_setting_id: 12345 } });
    html = await fetch(`${base}/manage?uuid=u-2`).then((r) => r.text());
    assert.match(html, /plugin_settings\/12345\/edit/);

    assert.equal((await post({ user: { uuid: '<bad>' } })).status, 400);
    assert.equal((await post({})).status, 400);

    await fetch(`${base}/webhooks/uninstall`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"uuid":"u-2"}' });
    html = await fetch(`${base}/manage?uuid=u-2`).then((r) => r.text());
    assert.doesNotMatch(html, /plugin_settings\//);
  });
});
