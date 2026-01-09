# Deployment Guide - TRMNL Weeks Plugin

This guide walks you through deploying the TRMNL Weeks plugin to your antfarm server using Codeberg and n8n.

## Overview

**Architecture:**
- **Git Repository**: Codeberg
- **CI/CD**: n8n webhook automation
- **Server**: antfarm (ssh.mrnow.at)
- **Domain**: trmnlweeks.mrnow.at
- **Port**: 3000
- **Process Manager**: systemd

## Prerequisites

- [x] Server access via SSH (antfarm-remote)
- [ ] Codeberg account
- [ ] n8n running at n8n.mrnow.at
- [ ] Domain DNS configured

## Step-by-Step Deployment

### 1. Create Codeberg Repository

1. Go to https://codeberg.org/repo/create
2. Repository name: `trmnl-weeks`
3. Description: `TRMNL plugin that displays ISO week numbers`
4. Make it public or private (your choice)
5. Click "Create Repository"

### 2. Configure Git Remote

```bash
# In your local project directory
git remote add origin https://codeberg.org/YOUR_USERNAME/trmnl-weeks.git

# Update deployment/deploy.sh with your Codeberg username
# Edit line: REPO_URL="https://codeberg.org/YOUR_USERNAME/trmnl-weeks.git"
```

### 3. Initial Server Setup

SSH into your server and set up the deployment:

```bash
ssh antfarm-remote

# Clone the repository
cd /home/antfarm/deployments/
git clone https://codeberg.org/YOUR_USERNAME/trmnl-weeks.git
cd trmnl-weeks

# Install dependencies
npm install --production

# Create environment file
cat > .env << 'EOF'
PORT=3000
BASE_URL=https://trmnlweeks.mrnow.at
NODE_ENV=production

# Add these after registering your plugin with TRMNL
TRMNL_CLIENT_ID=your_client_id_here
TRMNL_CLIENT_SECRET=your_client_secret_here
EOF

# Set proper permissions
chmod 600 .env

# Make deploy script executable
chmod +x deployment/deploy.sh
```

### 4. Install systemd Service

```bash
# Still on the server
sudo cp deployment/trmnl-weeks.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable trmnl-weeks
sudo systemctl start trmnl-weeks
sudo systemctl status trmnl-weeks
```

### 5. Configure Nginx

```bash
# Copy nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/trmnlweeks.mrnow.at

# Enable site
sudo ln -s /etc/nginx/sites-available/trmnlweeks.mrnow.at /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 6. Configure DNS

Add an A record for `trmnlweeks.mrnow.at` pointing to your server IP:

```
Type: A
Name: trmnlweeks
Value: YOUR_SERVER_IP
TTL: 3600
```

Or if using Cloudflare tunnels, configure accordingly.

### 7. Set Up n8n Webhook Workflow

1. Access n8n at https://n8n.mrnow.at
2. Create a new workflow named "TRMNL Weeks - Codeberg Deploy"
3. Import the workflow from `deployment/n8n-workflow.json` (see below)

Or create manually:

**Node 1: Webhook (Trigger)**
- Method: POST
- Path: `trmnl-weeks-deploy`
- Authentication: None (or add header auth if desired)

**Node 2: Execute Command**
- Command: `/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`
- Execute Once: Yes

**Node 3: Respond to Webhook**
- Respond With: Text
- Response Body: `Deployment triggered successfully`

Save and activate the workflow. Note your webhook URL:
```
https://n8n.mrnow.at/webhook/trmnl-weeks-deploy
```

### 8. Configure Codeberg Webhook

1. Go to your Codeberg repository settings
2. Navigate to: Settings → Webhooks → Add Webhook
3. Configure:
   - **Payload URL**: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`
   - **Content Type**: `application/json`
   - **Secret**: (optional, for added security)
   - **Trigger**: Just the push event
   - **Branch filter**: `main`
4. Click "Add Webhook"

### 9. Make Deploy Script Sudoable

The deploy script needs sudo access to restart the service:

```bash
ssh antfarm-remote

# Edit sudoers file
sudo visudo

# Add this line (replace with your username if different):
antfarm ALL=(ALL) NOPASSWD: /bin/systemctl restart trmnl-weeks, /bin/systemctl status trmnl-weeks, /bin/systemctl is-active trmnl-weeks, /usr/local/bin/kill_port.sh
```

### 10. Test Deployment

```bash
# Make a test commit
echo "# Test deployment" >> README.md
git add .
git commit -m "Test deployment pipeline"
git push origin main
```

Watch the deployment:
```bash
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -f
```

### 11. Register Plugin with TRMNL

1. Go to https://usetrmnl.com/plugins/my/new
2. Fill in the details:

| Field | Value |
|-------|-------|
| Name | Week Number |
| Description | Display the current ISO week number |
| Icon | Upload `icon.svg` |
| Installation URL | `https://trmnlweeks.mrnow.at/install` |
| Installation Success Webhook | `https://trmnlweeks.mrnow.at/webhooks/install-success` |
| Plugin Management URL | `https://trmnlweeks.mrnow.at/manage` |
| Plugin Markup URL | `https://trmnlweeks.mrnow.at/markup` |
| Uninstallation Webhook | `https://trmnlweeks.mrnow.at/webhooks/uninstall` |

3. Copy the `client_id` and `client_secret`
4. Update `.env` on server:

```bash
ssh antfarm-remote
cd /home/antfarm/deployments/trmnl-weeks
nano .env
# Add your TRMNL_CLIENT_ID and TRMNL_CLIENT_SECRET

# Restart service
sudo systemctl restart trmnl-weeks
```

## Verification

### Check Service Status
```bash
ssh antfarm-remote
sudo systemctl status trmnl-weeks
sudo journalctl -u trmnl-weeks -n 50 --no-pager
```

### Check Logs
```bash
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -f
```

### Test Endpoints
```bash
# Health check
curl https://trmnlweeks.mrnow.at/health

# Test markup endpoint
curl -X POST https://trmnlweeks.mrnow.at/markup \
  -H "Content-Type: application/json" \
  -d '{"user_uuid": "test-uuid"}'
```

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u trmnl-weeks -n 100 --no-pager

# Check if port is in use
sudo ss -tlnp | grep :3000

# Manually kill port
sudo /usr/local/bin/kill_port.sh 3000
```

### Deployment not triggering
1. Check Codeberg webhook delivery history
2. Check n8n workflow execution history
3. Verify webhook URL is correct
4. Check n8n logs

### Can't access domain
```bash
# Check nginx is running
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify DNS
dig trmnlweeks.mrnow.at
```

### Environment variables not loaded
```bash
# Check .env file exists
ls -la /home/antfarm/deployments/trmnl-weeks/.env

# Check systemd service loads it
sudo systemctl cat trmnl-weeks

# Check service environment
sudo systemctl show trmnl-weeks --property=Environment
```

## Maintenance

### Manual Deployment
```bash
ssh antfarm-remote
cd /home/antfarm/deployments/trmnl-weeks
git pull origin main
npm ci --production
sudo systemctl restart trmnl-weeks
```

### View Logs
```bash
# Real-time logs
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -f

# Last 100 lines
sudo journalctl -u trmnl-weeks -n 100 --no-pager
```

### Update Environment Variables
```bash
ssh antfarm-remote
cd /home/antfarm/deployments/trmnl-weeks
nano .env
sudo systemctl restart trmnl-weeks
```

## Security Notes

- `.env` file is never committed to git
- Use strong secrets for `TRMNL_CLIENT_SECRET`
- Consider adding webhook authentication in n8n
- Use HTTPS for all endpoints (configure SSL/TLS)
- Regularly update dependencies: `npm audit`

## Next Steps

After deployment is successful:
1. Set up SSL/TLS certificate (Let's Encrypt)
2. Configure monitoring/alerting
3. Set up log rotation
4. Consider adding a database for production use
5. Test the plugin installation flow with TRMNL
