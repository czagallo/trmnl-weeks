# Quick Start Guide - TRMNL Weeks

Follow these steps in order. Each step takes about 2-5 minutes.

## ✅ Checklist

### 1. Create Codeberg Repository (2 min)
- [ ] Go to https://codeberg.org/repo/create
- [ ] Name: `trmnl-weeks`
- [ ] Create repository
- [ ] Copy the repository URL

### 2. Update Deployment Script (1 min)
- [ ] Edit `deployment/deploy.sh`
- [ ] Change `YOUR_USERNAME` to your Codeberg username
- [ ] Save file

### 3. Push Code to Codeberg (2 min)
```bash
# In your local project directory
git remote add origin https://codeberg.org/YOUR_USERNAME/trmnl-weeks.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 4. Initial Server Setup (5 min)
```bash
ssh antfarm-remote

# Clone repository
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
TRMNL_CLIENT_ID=placeholder
TRMNL_CLIENT_SECRET=placeholder
EOF

chmod 600 .env
```

### 5. Install Systemd Service (3 min)
```bash
# Still on server
sudo cp deployment/trmnl-weeks.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable trmnl-weeks
sudo systemctl start trmnl-weeks
sudo systemctl status trmnl-weeks
```

### 6. Configure Nginx (3 min)
```bash
# Copy nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/trmnlweeks.mrnow.at

# Enable site
sudo ln -s /etc/nginx/sites-available/trmnlweeks.mrnow.at /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure DNS (2 min)
- [ ] Add A record: `trmnlweeks.mrnow.at` → your server IP
- [ ] Wait for DNS propagation (check: `dig trmnlweeks.mrnow.at`)

### 8. Set Up n8n Webhook (5 min)
- [ ] Go to https://n8n.mrnow.at
- [ ] Create new workflow: "TRMNL Weeks Deploy"
- [ ] Add Webhook node (POST, path: `trmnl-weeks-deploy`)
- [ ] Add Execute Command node: `/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`
- [ ] Add Respond to Webhook node
- [ ] Activate workflow
- [ ] Copy webhook URL

### 9. Add Codeberg Webhook (2 min)
- [ ] Go to repository Settings → Webhooks
- [ ] Add webhook: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`
- [ ] Trigger: Push events only
- [ ] Save webhook

### 10. Configure Sudo Access (2 min)
```bash
ssh antfarm-remote
sudo visudo

# Add this line:
antfarm ALL=(ALL) NOPASSWD: /bin/systemctl restart trmnl-weeks, /bin/systemctl status trmnl-weeks, /bin/systemctl is-active trmnl-weeks, /usr/local/bin/kill_port.sh

# Save and exit
```

### 11. Test Deployment (2 min)
```bash
# Local machine
echo "# Test" >> README.md
git add README.md
git commit -m "Test deployment"
git push origin main

# Watch on server
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -f
```

### 12. Register with TRMNL (5 min)
- [ ] Go to https://usetrmnl.com/plugins/my/new
- [ ] Upload `icon.svg`
- [ ] Fill in all URLs (use `https://trmnlweeks.mrnow.at`)
- [ ] Copy `client_id` and `client_secret`
- [ ] Update `.env` on server with real credentials
- [ ] Restart: `sudo systemctl restart trmnl-weeks`

### 13. Test Installation (3 min)
```bash
# Test health endpoint
curl https://trmnlweeks.mrnow.at/health

# Test markup endpoint
curl -X POST https://trmnlweeks.mrnow.at/markup \
  -H "Content-Type: application/json" \
  -d '{"user_uuid": "test"}'

# Install plugin on TRMNL and test full flow
```

## ✅ You're Done!

Your plugin should now:
- ✓ Auto-deploy when you push to Codeberg
- ✓ Run as a systemd service
- ✓ Be accessible at https://trmnlweeks.mrnow.at
- ✓ Handle TRMNL webhooks and screen generation

## Quick Commands

```bash
# View logs
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -f

# Restart service
sudo systemctl restart trmnl-weeks

# Check status
sudo systemctl status trmnl-weeks

# Manual deploy
cd /home/antfarm/deployments/trmnl-weeks
git pull
npm ci --production
sudo systemctl restart trmnl-weeks
```

## Need Help?

See `DEPLOYMENT.md` for detailed troubleshooting and configuration options.
