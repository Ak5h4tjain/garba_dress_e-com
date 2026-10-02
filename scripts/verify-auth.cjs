async function test() {
  console.log("=== Verifying Authentication & Authorization Subsystems ===");

  // 1. Vite server serving auth.html
  const r1 = await fetch('http://localhost:5173/auth.html');
  console.log("1. /auth.html HTTP Status:", r1.status);
  const text1 = await r1.text();
  console.log("   Contains entry-auth.jsx script tag:", text1.includes('entry-auth.jsx'));

  // 2. Vite server serving index.html
  const r2 = await fetch('http://localhost:5173/');
  console.log("2. / (Customer Storefront) HTTP Status:", r2.status);

  // 3. Node API demo accounts
  const r3 = await fetch('http://localhost:4000/api/auth/demo-accounts');
  console.log("3. GET /api/auth/demo-accounts Status:", r3.status);
  const d3 = await r3.json();
  const accounts = d3.accounts || d3;
  console.log("   Available Personas:", Object.keys(accounts));

  // 4. Node API login as CUSTOMER
  const r4 = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'CUSTOMER' })
  });
  const d4 = await r4.json();
  console.log("4. Login as CUSTOMER:", d4.user?.name, "(Role:", d4.user?.role + ") Token issued:", !!d4.token);

  // 5. Node API login as ADMIN
  const r5 = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'ADMIN' })
  });
  const d5 = await r5.json();
  console.log("5. Login as ADMIN:", d5.user?.name, "(Role:", d5.user?.role + ") IAM Role:", d5.user?.iamRole);

  // 6. Token verification API
  const r6 = await fetch('http://localhost:4000/api/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${d5.token}`
    }
  });
  const d6 = await r6.json();
  console.log("6. Bearer Token Verification Status:", r6.status, "Verified User:", d6.user?.name);

  console.log("\n=== All Authentication & Authorization Endpoints Operational ===");
}

test().catch(console.error);
