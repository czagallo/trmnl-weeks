# n8n Quick Setup Guide (3 Solutions)

You're right - n8n doesn't have an "Execute Command" node! Here are **3 working solutions**:

---

## 🏆 Solution 1: HTTP Endpoint (RECOMMENDED - 5 minutes)

The easiest approach. Create a small HTTP service that n8n calls.

### On Server:
```bash
ssh antfarm-remote
cd /home/antfarm/deployments/trmnl-weeks

# Generate token
DEPLOY_TOKEN=$(openssl rand -hex 32)
echo "Your token: $DEPLOY_TOKEN"  # SAVE THIS!

# Copy service file
sudo cp deployment/deploy-endpoint.service /etc/systemd/system/

# Edit to add your token
sudo nano /etc/systemd/system/deploy-endpoint.service
# Change: Environment="DEPLOY_TOKEN=your-token-here"

# Start service
sudo systemctl daemon-reload
sudo systemctl enable deploy-endpoint
sudo systemctl start deploy-endpoint
sudo systemctl status deploy-endpoint
```

### In n8n:
1. **Webhook Node**:
   - Method: POST
   - Path: `trmnl-weeks-deploy`

2. **HTTP Request Node**:
   - Method: POST
   - URL: `http://localhost:3001/deploy`
   - Authentication: Header Auth
     - Name: `Authorization`
     - Value: `Bearer YOUR_TOKEN_HERE`

3. **Respond to Webhook Node**:
   - Response Body: `{{ $json.stdout }}`

**Flow**: `[Webhook] → [HTTP Request] → [Respond]`

---

## 🔧 Solution 2: SSH Node (3 minutes)

Use n8n's SSH node.

### In n8n - Create Credential:
1. Credentials → Add Credential → SSH
2. Host: `localhost`
3. Port: `22`
4. Username: `antfarm`
5. Password: (your password)
6. Save as "SSH localhost"

### In n8n - Create Workflow:
1. **Webhook Node**: (same as Solution 1)

2. **SSH Node**:
   - Credentials: "SSH localhost"
   - Command: `/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`

3. **Respond to Webhook Node**: (same as Solution 1)

**Flow**: `[Webhook] → [SSH] → [Respond]`

---

## 💻 Solution 3: Code Node (2 minutes)

If your n8n has file system access.

### In n8n:
1. **Webhook Node**: (same as above)

2. **Code Node** (JavaScript):
```javascript
const { exec } = require('child_process');

return new Promise((resolve) => {
  exec('/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh',
    (error, stdout, stderr) => {
      resolve([{
        json: {
          success: !error,
          stdout: stdout,
          stderr: stderr
        }
      }]);
    }
  );
});
```

3. **Respond to Webhook Node**: (same as above)

**Flow**: `[Webhook] → [Code] → [Respond]`

---

## Which One?

- **Solution 1**: Most reliable, better security, easiest to debug
- **Solution 2**: Quick if you're comfortable with SSH
- **Solution 3**: Simplest workflow, but may not work in all n8n setups

**I recommend Solution 1** - it's the most robust.

---

## Testing

After setup, test your webhook:
```bash
curl -X POST https://n8n.mrnow.at/webhook/trmnl-weeks-deploy
```

Should return: "Deployment triggered successfully!"

---

## Troubleshooting

**Solution 1 not working?**
```bash
ssh antfarm-remote
sudo journalctl -u deploy-endpoint -f
```

**Solution 2 SSH fails?**
- Test: `ssh antfarm@localhost` (should work)
- Check n8n credentials

**Solution 3 doesn't work?**
- n8n might not have file system access
- Use Solution 1 or 2 instead

---

## Next Step

After n8n is working:
1. Get your webhook URL: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`
2. Add to Codeberg: Repo Settings → Webhooks → Add webhook
3. Push a commit to test!

Full details in: `deployment/N8N_SETUP.md`
