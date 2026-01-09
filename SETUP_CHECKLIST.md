# Setup Checklist for TRMNL Weeks Plugin

## 📋 What You Need to Do Next

I've set up all the code and configuration files. Here's your action plan:

---

## 🚀 Quick Path (30 minutes total)

Follow the **QUICKSTART.md** guide for a step-by-step walkthrough. Here's the summary:

### Phase 1: Repository Setup (5 min)

1. **Create Codeberg Repository**
   - [ ] Go to https://codeberg.org/repo/create
   - [ ] Name it: `trmnl-weeks`
   - [ ] Note your username: `_______________`

2. **Update Deployment Script**
   - [ ] Edit `deployment/deploy.sh` line 9
   - [ ] Change `YOUR_USERNAME` to your actual Codeberg username
   - [ ] Save the file

3. **Push to Codeberg**
   ```bash
   git remote add origin https://codeberg.org/YOUR_USERNAME/trmnl-weeks.git
   git push -u origin main
   ```

---

### Phase 2: Server Setup (15 min)

4. **Clone to Server**
   ```bash
   ssh antfarm-remote
   cd /home/antfarm/deployments/
   git clone https://codeberg.org/YOUR_USERNAME/trmnl-weeks.git
   cd trmnl-weeks
   npm install --production
   ```

5. **Create Environment File**
   ```bash
   cat > .env << 'EOF'
   PORT=3000
   BASE_URL=https://trmnlweeks.mrnow.at
   NODE_ENV=production
   TRMNL_CLIENT_ID=placeholder
   TRMNL_CLIENT_SECRET=placeholder
   EOF
   chmod 600 .env
   ```

6. **Install Service**
   ```bash
   sudo cp deployment/trmnl-weeks.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable trmnl-weeks
   sudo systemctl start trmnl-weeks
   sudo systemctl status trmnl-weeks
   ```
   ✅ Should see "active (running)"

7. **Configure Nginx**
   ```bash
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/trmnlweeks.mrnow.at
   sudo ln -s /etc/nginx/sites-available/trmnlweeks.mrnow.at /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **Add Sudo Permissions**
   ```bash
   sudo visudo
   # Add this line:
   antfarm ALL=(ALL) NOPASSWD: /bin/systemctl restart trmnl-weeks, /bin/systemctl status trmnl-weeks, /bin/systemctl is-active trmnl-weeks, /usr/local/bin/kill_port.sh
   ```

---

### Phase 3: DNS & Automation (10 min)

9. **Configure DNS**
   - [ ] Add A record: `trmnlweeks` → Your server IP
   - [ ] Wait 2-5 minutes for propagation
   - [ ] Test: `dig trmnlweeks.mrnow.at`

10. **Set Up n8n Webhook**
    - [ ] Open https://n8n.mrnow.at
    - [ ] Create new workflow: "TRMNL Weeks Deploy"
    - [ ] Import `deployment/n8n-workflow.json` OR:
      - Add Webhook node (POST, path: `trmnl-weeks-deploy`)
      - Add Execute Command: `/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`
      - Add Respond to Webhook node
    - [ ] Activate workflow
    - [ ] Copy webhook URL: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`

11. **Add Codeberg Webhook**
    - [ ] Go to repo Settings → Webhooks → Add Webhook
    - [ ] Payload URL: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`
    - [ ] Content Type: `application/json`
    - [ ] Trigger: Push events
    - [ ] Save

12. **Test Auto-Deploy**
    ```bash
    # On your local machine
    echo "# Deployment test" >> README.md
    git add README.md
    git commit -m "Test deployment"
    git push origin main

    # Watch on server
    ssh antfarm-remote
    sudo journalctl -u trmnl-weeks -f
    ```
    ✅ Should see "Deployment successful"

---

### Phase 4: TRMNL Registration (5 min)

13. **Register Plugin with TRMNL**
    - [ ] Go to https://usetrmnl.com/plugins/my/new
    - [ ] Upload `icon.svg` as the icon
    - [ ] Fill in these URLs:

    | Field | Value |
    |-------|-------|
    | Installation URL | `https://trmnlweeks.mrnow.at/install` |
    | Installation Success Webhook | `https://trmnlweeks.mrnow.at/webhooks/install-success` |
    | Plugin Management URL | `https://trmnlweeks.mrnow.at/manage` |
    | Plugin Markup URL | `https://trmnlweeks.mrnow.at/markup` |
    | Uninstallation Webhook | `https://trmnlweeks.mrnow.at/webhooks/uninstall` |

14. **Update Credentials**
    - [ ] Copy `client_id` from TRMNL
    - [ ] Copy `client_secret` from TRMNL
    ```bash
    ssh antfarm-remote
    cd /home/antfarm/deployments/trmnl-weeks
    nano .env
    # Update TRMNL_CLIENT_ID and TRMNL_CLIENT_SECRET
    sudo systemctl restart trmnl-weeks
    ```

15. **Test Everything**
    ```bash
    # Health check
    curl https://trmnlweeks.mrnow.at/health

    # Markup endpoint
    curl -X POST https://trmnlweeks.mrnow.at/markup \
      -H "Content-Type: application/json" \
      -d '{"user_uuid": "test"}'
    ```

    - [ ] Install the plugin on your TRMNL device
    - [ ] Verify week number appears on screen

---

## 🎉 Success Indicators

When everything is working:
- ✅ Service status: `sudo systemctl status trmnl-weeks` shows "active (running)"
- ✅ Health endpoint returns: `{"status":"ok","timestamp":"..."}`
- ✅ Markup endpoint returns HTML with week number
- ✅ Git push triggers automatic deployment
- ✅ Plugin installs successfully on TRMNL
- ✅ Week number displays on your e-ink screen

---

## 🐛 Common Issues & Fixes

### Service won't start
```bash
sudo journalctl -u trmnl-weeks -n 50 --no-pager
# Check for error messages
```

### Domain not accessible
```bash
# Check nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check DNS
dig trmnlweeks.mrnow.at
```

### Deployment not triggering
1. Check Codeberg webhook delivery history
2. Check n8n workflow execution log
3. Verify webhook URL is correct

### Can't restart service
```bash
# Verify sudo permissions
sudo -l | grep systemctl

# Manually restart
sudo systemctl restart trmnl-weeks
```

---

## 📚 Documentation

- **QUICKSTART.md** - Step-by-step guide (what you should follow)
- **DEPLOYMENT.md** - Detailed deployment documentation
- **README.md** - Plugin documentation and API reference

---

## 🆘 Need Help?

Common commands:
```bash
# View logs
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -f

# Check service
sudo systemctl status trmnl-weeks

# Restart service
sudo systemctl restart trmnl-weeks

# Manual deploy
cd /home/antfarm/deployments/trmnl-weeks
git pull
npm ci --production
sudo systemctl restart trmnl-weeks
```

---

## ✅ Current Status

- [x] Code written and tested locally
- [x] Git repository initialized
- [x] Deployment scripts created
- [x] Documentation complete
- [x] All files committed to git
- [ ] Pushed to Codeberg (YOU DO THIS)
- [ ] Server configured (YOU DO THIS)
- [ ] n8n webhook set up (YOU DO THIS)
- [ ] DNS configured (YOU DO THIS)
- [ ] TRMNL plugin registered (YOU DO THIS)

**Next step: Create your Codeberg repository and follow QUICKSTART.md**
