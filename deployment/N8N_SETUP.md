# n8n Webhook Setup for TRMNL Weeks Deployment

Since n8n doesn't have a direct "Execute Command" node, here are **two working solutions**:

---

## ✅ Solution 1: HTTP Request to Deployment Endpoint (Recommended - Easiest)

This is the simplest approach. We create a small HTTP endpoint that n8n can call.

### Step 1: Set Up Deployment Endpoint on Server

```bash
ssh antfarm-remote

# Navigate to deployment directory
cd /home/antfarm/deployments/trmnl-weeks

# Generate a secure token
DEPLOY_TOKEN=$(openssl rand -hex 32)
echo "Save this token: $DEPLOY_TOKEN"

# Create systemd service
sudo nano /etc/systemd/system/deploy-endpoint.service
```

Paste this content (update the DEPLOY_TOKEN):
```ini
[Unit]
Description=TRMNL Weeks Deployment Endpoint
After=network.target

[Service]
Type=simple
User=antfarm
Group=antfarm
WorkingDirectory=/home/antfarm/deployments/trmnl-weeks
Environment="NODE_ENV=production"
Environment="DEPLOY_TOKEN=your-token-here"

ExecStart=/usr/bin/node /home/antfarm/deployments/trmnl-weeks/deployment/deploy-endpoint.js

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable deploy-endpoint
sudo systemctl start deploy-endpoint
sudo systemctl status deploy-endpoint
```

The endpoint is now running on `http://localhost:3001/deploy`

### Step 2: Create n8n Workflow (Manual)

1. **Go to n8n**: https://n8n.mrnow.at

2. **Create New Workflow**

3. **Add Webhook Node**:
   - HTTP Method: `POST`
   - Path: `trmnl-weeks-deploy`
   - Response Mode: "Respond Using 'Respond to Webhook' Node"

4. **Add HTTP Request Node**:
   - Method: `POST`
   - URL: `http://localhost:3001/deploy`
   - Authentication: Generic Credential Type → Header Auth
     - Name: `Authorization`
     - Value: `Bearer YOUR_DEPLOY_TOKEN`
   - Connect from Webhook node

5. **Add Respond to Webhook Node**:
   - Respond With: `Text`
   - Response Body:
   ```
   Deployment triggered!

   Status: {{ $json.success ? "Success" : "Failed" }}
   Time: {{ $json.timestamp }}

   Output:
   {{ $json.stdout }}
   ```
   - Connect from HTTP Request node

6. **Activate** the workflow

7. **Get webhook URL**: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`

### Visual Flow:
```
[Webhook] → [HTTP Request to localhost:3001] → [Respond to Webhook]
```

---

## ✅ Solution 2: SSH Node (More Complex)

Use n8n's SSH node to execute commands directly on localhost.

### Step 1: Create SSH Credentials in n8n

1. Go to n8n → **Credentials**
2. Click **"Add Credential"**
3. Select **"SSH"**
4. Configure:
   - **Host**: `localhost`
   - **Port**: `22`
   - **Username**: `antfarm`
   - **Password**: Your antfarm user password
   - OR use Private Key authentication
5. **Save** as "SSH localhost"

### Step 2: Create n8n Workflow

1. **Add Webhook Node** (same as Solution 1)

2. **Add SSH Node**:
   - Select your "SSH localhost" credentials
   - Command: `/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`
   - Working Directory: `/home/antfarm/deployments/trmnl-weeks`

3. **Add Respond to Webhook Node**:
   - Response Body:
   ```
   Deployment complete!

   Output:
   {{ $json.stdout }}

   Errors:
   {{ $json.stderr }}
   ```

4. **Activate** workflow

### Visual Flow:
```
[Webhook] → [SSH Command] → [Respond to Webhook]
```

---

## ✅ Solution 3: Code Node (Alternative)

If you're comfortable with code, use n8n's Code node:

```javascript
const { exec } = require('child_process');

return new Promise((resolve, reject) => {
  exec('/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh', (error, stdout, stderr) => {
    if (error) {
      resolve([{
        json: {
          success: false,
          error: error.message,
          stderr: stderr
        }
      }]);
    } else {
      resolve([{
        json: {
          success: true,
          stdout: stdout,
          stderr: stderr
        }
      }]);
    }
  });
});
```

**Note**: This requires n8n to have file system access and may not work in all n8n setups.

---

## 🎯 Which Solution Should You Use?

### Use **Solution 1** (HTTP Endpoint) if:
- ✅ You want the simplest setup
- ✅ You want better security (token-based)
- ✅ You want to avoid SSH password in n8n
- ✅ You might want to trigger deployments from other sources later

### Use **Solution 2** (SSH Node) if:
- ✅ You're already familiar with SSH in n8n
- ✅ You want to see the workflow in the JSON import
- ✅ You need to run multiple commands

---

## 📝 Testing Your Setup

### Test the Deployment Endpoint (Solution 1):
```bash
curl -X POST http://localhost:3001/deploy \
  -H "Authorization: Bearer YOUR_DEPLOY_TOKEN"
```

### Test the n8n Webhook:
```bash
curl -X POST https://n8n.mrnow.at/webhook/trmnl-weeks-deploy \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Check Logs:
```bash
# Main application
sudo journalctl -u trmnl-weeks -f

# Deployment endpoint (if using Solution 1)
sudo journalctl -u deploy-endpoint -f
```

---

## 🔧 Troubleshooting

### Solution 1 Issues:

**Endpoint not responding:**
```bash
sudo systemctl status deploy-endpoint
sudo journalctl -u deploy-endpoint -n 50
```

**Port already in use:**
```bash
# Change port in deploy-endpoint.js
# Change port in n8n HTTP Request node
```

### Solution 2 Issues:

**SSH connection fails:**
- Verify SSH is running: `sudo systemctl status ssh`
- Test SSH: `ssh antfarm@localhost`
- Check credentials in n8n

**Permission denied:**
- Ensure deploy.sh is executable: `chmod +x deployment/deploy.sh`
- Check sudo permissions for systemctl commands

---

## 🔐 Security Notes

### For Solution 1:
- Generate a strong random token: `openssl rand -hex 32`
- Keep the token secret
- Only endpoint is localhost (not exposed to internet)
- n8n calls it internally

### For Solution 2:
- Store SSH credentials securely in n8n
- Consider using SSH keys instead of password
- Restrict SSH key to specific commands only

---

## 📦 What Gets Deployed

When the webhook triggers:
1. Pulls latest code from Codeberg
2. Runs `npm ci --production`
3. Restarts the trmnl-weeks service
4. Returns success/failure status

---

## Next Steps

1. Choose your solution (I recommend Solution 1)
2. Set up the deployment endpoint OR SSH credentials
3. Create the n8n workflow
4. Test it manually
5. Add the webhook to Codeberg
6. Push a commit to test auto-deployment

Your webhook URL for Codeberg:
```
https://n8n.mrnow.at/webhook/trmnl-weeks-deploy
```
