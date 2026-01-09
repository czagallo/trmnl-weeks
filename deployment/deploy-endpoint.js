#!/usr/bin/env node

/**
 * Simple HTTP endpoint for triggering deployments
 * This runs as a separate service on the server and can be called by n8n
 *
 * Usage: node deploy-endpoint.js
 * Then configure n8n to POST to http://localhost:3001/deploy
 */

const http = require('http');
const { exec } = require('child_process');

const PORT = 3001;
const DEPLOY_SCRIPT = '/home/antfarm/deployments/trmnl-weeks/deployment/deploy.sh';

// Optional: Add a secret token for security
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || 'change-me-in-production';

const server = http.createServer((req, res) => {
  // Only accept POST to /deploy
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Optional: Check authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${DEPLOY_TOKEN}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // Execute deployment script
  console.log(`[${new Date().toISOString()}] Deployment triggered`);

  exec(DEPLOY_SCRIPT, (error, stdout, stderr) => {
    const response = {
      success: !error,
      timestamp: new Date().toISOString(),
      stdout: stdout,
      stderr: stderr
    };

    if (error) {
      console.error('Deployment error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
    } else {
      console.log('Deployment successful');
      res.writeHead(200, { 'Content-Type': 'application/json' });
    }

    res.end(JSON.stringify(response, null, 2));
  });
});

server.listen(PORT, 'localhost', () => {
  console.log(`Deployment endpoint listening on http://localhost:${PORT}/deploy`);
  console.log(`Deploy token: ${DEPLOY_TOKEN}`);
});
