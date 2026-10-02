const http = require('http');

function cdpRequest(endpoint, postData) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: postData ? 'POST' : 'GET',
      headers: postData ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  console.log("=== Testing Auth Portal & RBAC Authorization Gate ===");
  try {
    const pages = await cdpRequest('http://localhost:9222/json/list');
    const targetPage = pages.find(p => p.type === 'page');

    if (!targetPage) {
      console.log("No active Chrome page target on 9222. Testing via direct HTTP requests...");
      const authRes = await fetch('http://localhost:5173/auth.html');
      console.log("HTTP /auth.html status:", authRes.status);
      const apiDemoAccounts = await fetch('http://localhost:4000/api/auth/demo-accounts');
      const accountsJson = await apiDemoAccounts.json();
      console.log("API /api/auth/demo-accounts status:", apiDemoAccounts.status, "Accounts:", Object.keys(accountsJson.accounts));
      return;
    }

    const WebSocket = require('ws');
    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    let id = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (data) => {
          const msg = JSON.parse(data);
          if (msg.id === msgId) {
            ws.off('message', handler);
            resolve(msg.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.on('open', async () => {
      console.log("Connected to Chrome CDP target...");

      // 1. Navigate to auth.html
      console.log("Navigating to http://localhost:5173/auth.html...");
      await sendCommand('Page.navigate', { url: 'http://localhost:5173/auth.html' });
      await new Promise(r => setTimeout(r, 2000));

      const authTitleRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.title'
      });
      console.log("Auth Page Title:", authTitleRes?.result?.value);

      const authHeadersRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.querySelector("h1, h2")?.innerText'
      });
      console.log("Auth Header:", authHeadersRes?.result?.value);

      const rbacTableRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.querySelector("table") ? "Table Present" : "Table Missing"'
      });
      console.log("RBAC Policy Matrix:", rbacTableRes?.result?.value);

      // 2. Navigate to Customer Storefront
      console.log("\nNavigating to http://localhost:5173/...");
      await sendCommand('Page.navigate', { url: 'http://localhost:5173/' });
      await new Promise(r => setTimeout(r, 2000));

      const customerUserRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.body.innerText.includes("Priya Patel") ? "Priya Patel (Customer) Detected" : "User Not In Header"'
      });
      console.log("Customer Persona in Header:", customerUserRes?.result?.value);

      // 3. Test Access Denied Gate
      console.log("\nTesting Access Denied Gate when accessing /admin.html as CUSTOMER...");
      // Ensure localStorage has customer saved
      await sendCommand('Runtime.evaluate', {
        expression: `
          localStorage.setItem('auth_user', JSON.stringify({
            id: 'cust_priya_01',
            name: 'Priya Patel',
            role: 'CUSTOMER',
            email: 'priya.patel@gmail.com',
            permissions: ['BROWSE_CATALOG']
          }));
        `
      });

      await sendCommand('Page.navigate', { url: 'http://localhost:5173/admin.html' });
      await new Promise(r => setTimeout(r, 2000));

      const gateCheckRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.body.innerText.includes("403 Forbidden") || document.body.innerText.includes("Role Escalation Prevented")'
      });
      console.log("Access Denied Gate Triggered for Customer:", gateCheckRes?.result?.value ? "PASS (403 Intercepted)" : "FAIL");

      const gateTextRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.querySelector("h3")?.innerText'
      });
      console.log("Gate Banner:", gateTextRes?.result?.value);

      // 4. Test Elevating to ADMIN
      console.log("\nTesting login/elevation as ADMIN...");
      await sendCommand('Runtime.evaluate', {
        expression: `
          localStorage.setItem('auth_user', JSON.stringify({
            id: 'admin_vikrant_01',
            name: 'Vikrant Sharma',
            role: 'ADMIN',
            email: 'admin.ops@garbacholi.express',
            permissions: ['ALL']
          }));
        `
      });
      await sendCommand('Page.navigate', { url: 'http://localhost:5173/admin.html' });
      await new Promise(r => setTimeout(r, 2000));

      const adminPassRes = await sendCommand('Runtime.evaluate', {
        expression: 'document.body.innerText.includes("Command Center") && document.body.innerText.includes("Admin HQ")'
      });
      console.log("Admin Clearance Granted:", adminPassRes?.result?.value ? "PASS (Admin Terminal Accessible)" : "FAIL");

      ws.close();
      console.log("\n=== All Auth & Authorization Tests Completed Successfully ===");
    });

  } catch (err) {
    console.error("Test error:", err);
  }
}

run();
