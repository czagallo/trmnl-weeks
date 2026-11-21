require('dotenv').config();
const path = require('path');
const express = require('express');
const { weekInfo } = require('./src/week');
const { renderAll } = require('./src/markup');

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ID = process.env.TRMNL_CLIENT_ID;
const CLIENT_SECRET = process.env.TRMNL_CLIENT_SECRET;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const TRMNL_OAUTH_URL = 'https://usetrmnl.com/oauth/token';
const UUID_RE = /^[A-Za-z0-9-]{1,64}$/;

const app = express();
app.disable('x-powered-by');
// TRMNL posts the markup request form-encoded with nested keys (trmnl[user][time_zone_iana]); JSON is for local tools.
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

// `trmnl` metadata arrives either as nested form keys (already an object) or as one JSON string.
function trmnlMeta(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.length < 50000) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* not JSON: ignore */
    }
  }
  return {};
}

app.get('/icon.svg', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'icon.svg'));
});

// ---------------------------------------------------------------------------
// Installation (OAuth). The plugin has no per-user settings; the only thing kept is the
// plugin_setting_id per user, so /manage can link back to the right settings page.
// ---------------------------------------------------------------------------

const settingIds = new Map(); // user uuid -> plugin_setting_id (in memory, lost on restart)

app.get('/install', async (req, res) => {
  const { code, installation_callback_url: callback } = req.query;
  if (!code || !callback) return res.status(400).json({ error: 'Missing code or installation_callback_url' });
  if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).json({ error: 'Plugin credentials not configured' });

  try {
    const r = await fetch(TRMNL_OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, grant_type: 'authorization_code' }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || !body.access_token) throw new Error(`token exchange failed (HTTP ${r.status})`);
    console.log('Install: token exchange ok');
    res.redirect(302, callback);
  } catch (err) {
    console.error('Install failed:', err.message);
    res.status(500).json({ error: 'Installation failed' });
  }
});

app.post('/webhooks/install-success', (req, res) => {
  const user = req.body?.user;
  const uuid = user?.uuid != null ? String(user.uuid) : '';
  const settingId = user?.plugin_setting_id != null ? String(user.plugin_setting_id) : '';
  if (!UUID_RE.test(uuid)) return res.status(400).json({ error: 'No user data' });
  if (UUID_RE.test(settingId)) settingIds.set(uuid, settingId);
  console.log('Install success webhook');
  res.json({ success: true });
});

app.post('/webhooks/uninstall', (req, res) => {
  const uuid = String(req.body?.user?.uuid ?? req.body?.uuid ?? '');
  if (UUID_RE.test(uuid)) settingIds.delete(uuid);
  console.log('Uninstall webhook');
  res.json({ success: true });
});

app.get('/manage', (req, res) => {
  const uuid = String(req.query.uuid || '');
  const settingId = UUID_RE.test(uuid) ? settingIds.get(uuid) : undefined;
  // settingId was checked against UUID_RE when stored; encode anyway.
  const back = settingId
    ? `https://usetrmnl.com/plugin_settings/${encodeURIComponent(settingId)}/edit?force_refresh=true`
    : 'https://usetrmnl.com';
  res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Week Number</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.5;color:#222}
a{color:#222}</style></head>
<body><h1>Week Number</h1>
<p>Nothing to configure. The plugin shows the current ISO 8601 week number, its week-year and the
Monday&ndash;Sunday dates, in every layout and on every TRMNL screen size.</p>
<p>The week is worked out in the time zone set on your TRMNL account. ISO weeks start on Monday, and
week 1 is the week that contains the year's first Thursday, so the first days of January can belong
to the previous year's last week.</p>
<p><a href="${back}">Back to TRMNL</a></p></body></html>`);
});

// ---------------------------------------------------------------------------
// Screen generation
// ---------------------------------------------------------------------------

app.post('/markup', (req, res) => {
  const trmnl = trmnlMeta(req.body?.trmnl);
  const w = weekInfo(new Date(), trmnl.user?.time_zone_iana);
  res.json(renderAll(w, { baseUrl: BASE_URL, instance: trmnl.plugin_settings?.instance_name }));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => console.log(`TRMNL Week Number plugin on http://127.0.0.1:${PORT}`));
}

module.exports = { app, trmnlMeta };
