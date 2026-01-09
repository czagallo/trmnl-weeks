# TRMNL Week Number Plugin

A TRMNL plugin that displays the current ISO week number on your e-ink display.

## Features

- Displays the current ISO 8601 week number
- Shows the year and week date range
- Supports all TRMNL layout formats (full, half-vertical, half-horizontal, quadrant)
- Complete OAuth installation flow
- No configuration needed - works out of the box

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd trmnl-weeks
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
PORT=3000
BASE_URL=https://your-domain.com

# You'll get these after registering your plugin in step 4
TRMNL_CLIENT_ID=your_client_id_here
TRMNL_CLIENT_SECRET=your_client_secret_here
```

### 3. Deploy Your Server

Deploy to your preferred hosting platform:

**Railway:**
```bash
railway up
```

**Render:**
- Connect your GitHub repo
- Add environment variables in the Render dashboard

**Heroku:**
```bash
heroku create
git push heroku main
```

Note your public URL (e.g., `https://your-app.railway.app`).

### 4. Register Your Plugin with TRMNL

Go to https://usetrmnl.com/plugins/my/new and fill in:

| Field | Value |
|-------|-------|
| **Name** | Week Number |
| **Description** | Display the current ISO week number on your TRMNL device |
| **Icon** | Upload `icon.svg` (or convert to PNG) |
| **Installation URL** | `https://your-domain.com/install` |
| **Installation Success Webhook URL** | `https://your-domain.com/webhooks/install-success` |
| **Plugin Management URL** | `https://your-domain.com/manage` |
| **Plugin Markup URL** | `https://your-domain.com/markup` |
| **Uninstallation Webhook URL** | `https://your-domain.com/webhooks/uninstall` |

After registration, TRMNL will provide you with:
- `client_id`
- `client_secret`

Add these to your `.env` file and redeploy.

### 5. Test Your Plugin

Visit your plugin's installation page on TRMNL and click "Install". You should be:
1. Redirected to your installation URL
2. Automatically redirected back to TRMNL
3. See a success message
4. Be able to add the plugin to a playlist

## API Endpoints

### Installation Flow

**GET `/install`**
- Receives OAuth token and callback URL from TRMNL
- Exchanges token for access_token
- Redirects user back to TRMNL

**POST `/webhooks/install-success`**
- Receives user data after successful installation
- Stores user connection information
- Body: `{ user_uuid, plugin_setting_id, access_token, ... }`

**POST `/webhooks/uninstall`**
- Called when user uninstalls the plugin
- Cleans up user data
- Body: `{ user_uuid }`

**GET `/manage?uuid=<user_uuid>`**
- Plugin settings/management page
- Users can view plugin info and return to TRMNL

### Screen Generation

**POST `/markup`**
- Main endpoint that TRMNL calls to get screen content
- Headers: `Authorization: Bearer {access_token}`
- Body: `{ user_uuid, trmnl }`
- Returns HTML markup for all layout sizes

**GET `/health`**
- Health check endpoint
- Returns: `{ status: 'ok', timestamp: '...' }`

## Week Number Calculation

This plugin uses the ISO 8601 week date system:
- Week 1 is the first week with a Thursday in the new year
- Weeks start on Monday and end on Sunday
- Each week is assigned a number from 1 to 52 (or 53)

## Project Structure

```
trmnl-weeks/
├── server.js          # Main application server
├── package.json       # Node.js dependencies
├── icon.svg          # Plugin icon (512x512)
├── .env.example      # Environment variables template
├── .env              # Your environment variables (not in git)
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Data Storage

The plugin uses in-memory storage (Map) for plugin connections. This is fine for development and small deployments.

**For production**, consider using a database:
- PostgreSQL with Prisma
- MongoDB with Mongoose
- Redis for session storage

Replace the `pluginConnections` Map with your database queries.

## Customization

Edit the markup generation functions in `server.js`:

- `generateFullMarkup()` - Full screen (800x480)
- `generateHalfVerticalMarkup()` - Half vertical (400x480)
- `generateHalfHorizontalMarkup()` - Half horizontal (800x240)
- `generateQuadrantMarkup()` - Quadrant (400x240)

Each function returns HTML that TRMNL converts to an e-ink image.

## Development

Run locally with auto-reload:

```bash
npm run dev
```

Test endpoints with curl:

```bash
# Health check
curl http://localhost:3000/health

# Test markup generation
curl -X POST http://localhost:3000/markup \
  -H "Content-Type: application/json" \
  -d '{"user_uuid": "test-uuid", "trmnl": {}}'
```

## Troubleshooting

**Installation fails:**
- Check that `TRMNL_CLIENT_ID` and `TRMNL_CLIENT_SECRET` are set correctly
- Verify your server is publicly accessible
- Check server logs for OAuth errors

**Markup not displaying:**
- Ensure `/markup` endpoint is accessible
- Check that TRMNL can reach your server
- Verify the returned HTML is valid

**"Missing credentials" error:**
- Make sure `.env` file exists and is loaded
- Restart server after changing environment variables

## Security Notes

- Never commit `.env` file to git
- Keep `CLIENT_SECRET` confidential
- Use HTTPS in production
- Validate webhook signatures in production (TRMNL sends `Authorization` header)

## Resources

- [TRMNL Plugin Documentation](https://docs.usetrmnl.com/go/plugin-marketplace/plugin-creation)
- [TRMNL Installation Flow](https://docs.usetrmnl.com/go/plugin-marketplace/plugin-installation-flow)
- [TRMNL Framework Docs](https://usetrmnl.com/framework)

## License

MIT

