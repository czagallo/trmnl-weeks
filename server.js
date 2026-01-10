require('dotenv').config();
const express = require('express');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
const CLIENT_ID = process.env.TRMNL_CLIENT_ID;
const CLIENT_SECRET = process.env.TRMNL_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// In-memory storage for plugin connections
// In production, use a database (PostgreSQL, MongoDB, etc.)
const pluginConnections = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// INSTALLATION FLOW ENDPOINTS
// ============================================================================

// Step 1: Installation URL - TRMNL sends code and callback URL
app.get('/install', async (req, res) => {
  // Log the incoming request for debugging
  console.log('Install request received:');
  console.log('Query params:', req.query);

  // TRMNL sends 'code' (OAuth authorization code) not 'token'
  const { code, installation_callback_url } = req.query;

  if (!code || !installation_callback_url) {
    console.error('Missing required parameters');
    return res.status(400).json({
      error: 'Missing code or installation_callback_url',
      received_query: req.query
    });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Plugin credentials not configured' });
  }

  try {
    // Step 2: Exchange authorization code for access_token
    console.log('Exchanging authorization code for access token...');
    const accessToken = await exchangeCodeForAccess(code);
    console.log('Access token received successfully');

    // Step 3: Store the access token temporarily (will get user data via webhook)
    // In production, associate this with a session or temporary ID

    // Step 4: Redirect user back to TRMNL
    // Use the exact callback URL that TRMNL provided
    console.log('Redirecting to:', installation_callback_url);
    res.redirect(302, installation_callback_url);
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({ error: 'Installation failed', details: error.message });
  }
});

// Helper function to exchange authorization code for access_token
function exchangeCodeForAccess(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    });

    const options = {
      hostname: 'usetrmnl.com',
      port: 443,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log('OAuth response:', data);
          const response = JSON.parse(data);
          console.log('Parsed response:', response);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`No access_token in response: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Installation success webhook - receives user data after successful installation
app.post('/webhooks/install-success', (req, res) => {
  const userData = req.body;
  const { user_uuid, plugin_setting_id, access_token } = userData;

  console.log('Installation successful for user:', user_uuid);

  // Store user connection data
  pluginConnections.set(user_uuid, {
    plugin_setting_id,
    access_token,
    installed_at: new Date().toISOString(),
    user_data: userData
  });

  res.status(200).json({ success: true });
});

// Uninstallation webhook - cleanup when user uninstalls
app.post('/webhooks/uninstall', (req, res) => {
  const { user_uuid } = req.body;

  console.log('Uninstalling plugin for user:', user_uuid);

  // Remove user data
  pluginConnections.delete(user_uuid);

  res.status(200).json({ success: true });
});

// Plugin management URL - where users can manage settings
app.get('/manage', (req, res) => {
  const { uuid } = req.query;

  if (!uuid) {
    return res.status(400).send('Missing uuid parameter');
  }

  const connection = pluginConnections.get(uuid);

  // Simple management page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Week Number Plugin Settings</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        p { color: #666; line-height: 1.6; }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #2563EB;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
        .btn:hover { background: #1E40AF; }
        .info {
          background: #DBEAFE;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>📅 Week Number Plugin</h1>
        <p>Your plugin is active and displaying the current ISO week number on your TRMNL device.</p>

        <div class="info">
          <strong>About ISO Week Numbers:</strong><br>
          This plugin uses the ISO 8601 week date system, where weeks start on Monday and Week 1 is the first week with a Thursday in the new year.
        </div>

        <p>This plugin doesn't require any configuration - it automatically shows the current week number based on your timezone.</p>

        ${connection && connection.plugin_setting_id ?
          `<a href="https://usetrmnl.com/plugin_settings/${connection.plugin_setting_id}/edit?force_refresh=true" class="btn">← Back to TRMNL</a>` :
          `<a href="https://usetrmnl.com" class="btn">← Back to TRMNL</a>`
        }
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// MARKUP GENERATION ENDPOINTS
// ============================================================================

// Helper function to calculate ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

// Helper function to get week date range
function getWeekDateRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

// Main plugin markup endpoint
app.post('/markup', (req, res) => {
  const { user_uuid, trmnl } = req.body;

  // Get current date (or use user timezone from trmnl metadata if available)
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  const dateRange = getWeekDateRange(now);

  // Generate markup for all layouts
  const response = {
    markup: generateFullMarkup(weekNumber, year, dateRange),
    markup_half_vertical: generateHalfVerticalMarkup(weekNumber, year),
    markup_half_horizontal: generateHalfHorizontalMarkup(weekNumber, year),
    markup_quadrant: generateQuadrantMarkup(weekNumber),
    shared: ""
  };

  res.json(response);
});

// Full screen layout
function generateFullMarkup(weekNumber, year, dateRange) {
  return `
    <div class="view view--full">
      <div class="layout">
        <div class="title_bar">
          <div class="title">Week Number</div>
        </div>
        <div class="markdown" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center;">
          <div style="font-size: 180px; font-weight: 700; line-height: 1; margin-bottom: 20px;">
            ${weekNumber}
          </div>
          <div class="content" style="font-size: 32px; font-weight: 400; margin-bottom: 10px;">
            Week of ${year}
          </div>
          <div class="label" style="font-size: 24px; font-weight: 300;">
            ${dateRange}
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

// Half vertical layout (left/right mashup)
function generateHalfVerticalMarkup(weekNumber, year) {
  return `
    <div class="view view--half_vertical">
      <div class="layout">
        <div class="title_bar">
          <div class="title">Week</div>
        </div>
        <div class="markdown" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center;">
          <div style="font-size: 120px; font-weight: 700; line-height: 1;">
            ${weekNumber}
          </div>
          <div class="content" style="font-size: 20px; font-weight: 400; margin-top: 10px;">
            ${year}
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

// Half horizontal layout
function generateHalfHorizontalMarkup(weekNumber, year) {
  return `
    <div class="view view--half_horizontal">
      <div class="layout">
        <div class="title_bar">
          <div class="title">Week Number</div>
        </div>
        <div class="markdown" style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;">
          <div style="font-size: 100px; font-weight: 700; line-height: 1;">
            Week ${weekNumber}
          </div>
          <div class="content" style="font-size: 24px; font-weight: 400; margin-left: 20px;">
            ${year}
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

// Quadrant layout
function generateQuadrantMarkup(weekNumber) {
  return `
    <div class="view view--quadrant">
      <div class="layout">
        <div class="markdown" style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;">
          <div>
            <div class="label" style="font-size: 12px; font-weight: 400; margin-bottom: 5px;">
              WEEK
            </div>
            <div style="font-size: 60px; font-weight: 700; line-height: 1;">
              ${weekNumber}
            </div>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`TRMNL Week Number Plugin running on port ${PORT}`);
  console.log(`Markup endpoint: POST http://localhost:${PORT}/markup`);
});
