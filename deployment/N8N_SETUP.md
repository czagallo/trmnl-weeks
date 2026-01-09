# n8n Webhook Setup for TRMNL Weeks Deployment

## Method 1: Import the Workflow (Recommended)

### Step 1: Copy the Workflow JSON

The workflow is in `deployment/n8n-workflow.json`. You'll import this into n8n.

### Step 2: Import into n8n

1. **Open n8n**: Go to https://n8n.mrnow.at

2. **Create New Workflow**:
   - Click the "+" button or "Add workflow" in the sidebar
   - Or click on the n8n logo → "Workflows" → "Create new"

3. **Import the JSON**:
   - Click the menu (three dots) in the top right
   - Select "Import from File" or "Import from URL"
   - OR just paste the JSON:
     - Click menu → "Import from File"
     - Select `deployment/n8n-workflow.json`
   - OR paste directly:
     - Open the workflow editor
     - Click menu (⋮) → "Settings" → "Import/Export"
     - Paste the entire JSON content
     - Click "Import"

4. **Activate the Workflow**:
   - Toggle the switch at the top right from "Inactive" to "Active"
   - The workflow will now be listening for webhooks

5. **Get Your Webhook URL**:
   - Click on the "Webhook" node
   - Look for "Production URL" or "Webhook URLs"
   - Copy the URL (should be: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`)
   - Save this URL - you'll need it for Codeberg

### Step 3: Test the Webhook

```bash
# Test from your local machine
curl -X POST https://n8n.mrnow.at/webhook/trmnl-weeks-deploy \
  -H "Content-Type: application/json" \
  -d '{"test": "deployment"}'
```

You should see: "Deployment triggered successfully!"

---

## Method 2: Create Manually (If Import Doesn't Work)

### Node 1: Webhook Trigger

1. **Add Webhook Node**:
   - Click "Add node" or press Tab
   - Search for "Webhook"
   - Select "Webhook" from the list

2. **Configure Webhook**:
   - **HTTP Method**: `POST`
   - **Path**: `trmnl-weeks-deploy`
   - **Response Mode**: Select "Respond Using 'Respond to Webhook' Node"
   - **Authentication**: None
   - Leave other settings as default

3. **Note the Webhook URL**:
   - After saving, n8n will show you the webhook URL
   - It should be: `https://n8n.mrnow.at/webhook/trmnl-weeks-deploy`

### Node 2: Execute Command

1. **Add Execute Command Node**:
   - Click the "+" button after the Webhook node
   - Search for "Execute Command"
   - Select it

2. **Configure Command**:
   - **Command**: `/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`
   - Leave "Execute Once" checked (default)

3. **Connect to Webhook**:
   - Drag a connection from the Webhook node to this node

### Node 3: Respond to Webhook

1. **Add Respond to Webhook Node**:
   - Click the "+" button after Execute Command
   - Search for "Respond to Webhook"
   - Select it

2. **Configure Response**:
   - **Respond With**: `Text`
   - **Response Body**:
   ```
   Deployment triggered successfully!

   Timestamp: {{ $now.toISO() }}

   Output:
   {{ $json.stdout }}

   Errors (if any):
   {{ $json.stderr }}
   ```

3. **Connect Nodes**:
   - Drag a connection from Execute Command to this node

### Final Step: Activate

- Click "Active" toggle in top right
- Click "Save" to save the workflow
- Name it "TRMNL Weeks - Codeberg Deploy"

---

## Workflow Visual Layout

```
[Webhook]
    ↓
[Execute Deploy Script]
    ↓
[Respond to Webhook]
```

---

## Testing the Workflow

### 1. Test Webhook Manually

In n8n:
1. Click on the Webhook node
2. Click "Listen for test event"
3. In another terminal:
   ```bash
   curl -X POST https://n8n.mrnow.at/webhook/trmnl-weeks-deploy \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
4. You should see the webhook received in n8n
5. Click "Execute workflow" to test the full flow

### 2. Check Execution Log

- After the webhook triggers, click "Executions" in the sidebar
- View the latest execution
- Check each node's output:
  - Webhook: Should show the POST data
  - Execute Command: Should show script output
  - Respond to Webhook: Should show response sent back

### 3. Check on Server

```bash
ssh antfarm-remote
sudo journalctl -u trmnl-weeks -n 50 --no-pager
```

---

## Troubleshooting

### Webhook URL doesn't work
- Make sure workflow is "Active"
- Check n8n is accessible: `curl https://n8n.mrnow.at`
- Verify the path matches: `/webhook/trmnl-weeks-deploy`

### Execute Command fails
- Check the script path is correct
- Verify script is executable: `ls -la /home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh`
- Check script has proper permissions
- View n8n execution logs for error details

### Script runs but service doesn't restart
- Check sudo permissions: `sudo -l`
- Verify sudoers file has the necessary permissions (see DEPLOYMENT.md)
- Check systemd logs: `sudo journalctl -u trmnl-weeks -n 50`

### Import fails
- Try copying the JSON content and pasting it manually
- Use Method 2 (manual creation) instead
- Check n8n version compatibility

---

## Security Considerations

### Option 1: Add Webhook Authentication (Recommended)

1. Edit the Webhook node
2. Under "Authentication":
   - Select "Header Auth"
3. Add a header:
   - Name: `X-Deploy-Token`
   - Value: Generate a random token (save it securely)

4. Update Codeberg webhook:
   - Add custom header: `X-Deploy-Token: your-random-token`

### Option 2: IP Whitelist

Configure n8n to only accept webhooks from Codeberg's IP addresses.

### Option 3: Use Webhook Secret

1. In Codeberg webhook settings, add a secret
2. In n8n, validate the signature (requires Function node)

---

## Next Steps

After setting up n8n:
1. Copy your webhook URL
2. Go to Codeberg repository settings
3. Add webhook (see main DEPLOYMENT.md)
4. Test by pushing a commit

Your webhook URL should be:
```
https://n8n.mrnow.at/webhook/trmnl-weeks-deploy
```
