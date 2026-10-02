// ==============================================================
// GarbaCholi.Express - Auth Portal & RBAC Matrix Logic
// ==============================================================

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('auth');
  updateTokenInspector();
  highlightActivePersona();
});

function updateTokenInspector() {
  const user = getAuthUser();
  const token = localStorage.getItem('auth_token') || `jwt_${user.role.toLowerCase()}_${Date.now()}_9b2f4a`;
  
  const tokenEl = document.getElementById('active-token-string');
  const claimsEl = document.getElementById('token-claims-summary');

  if (tokenEl) tokenEl.innerText = token;
  if (claimsEl) {
    claimsEl.innerHTML = `
      <strong>Subject:</strong> ${user.name} • 
      <strong>Role:</strong> <span style="color: var(--festive-gold)">${user.role}</span> • 
      <strong>Permissions:</strong> ${(user.permissions || []).slice(0, 3).join(', ')}...
    `;
  }
}

function highlightActivePersona() {
  const user = getAuthUser();
  document.querySelectorAll('.persona-card').forEach(card => {
    card.classList.toggle('active', card.innerText.includes(user.role));
  });
}

function activatePersona(role) {
  const account = DEMO_ACCOUNTS[role];
  if (!account) return;

  setAuthUser(account);
  const token = `jwt_${role.toLowerCase()}_${Date.now()}_demo`;
  localStorage.setItem('auth_token', token);

  showToast(`Authenticated as ${account.name} (${account.role})!`, 'success');
  updateTokenInspector();
  highlightActivePersona();

  // Route based on role
  setTimeout(() => {
    if (role === 'CUSTOMER') window.location.href = 'index.html';
    else if (role === 'RIDER') window.location.href = 'rider.html';
    else if (role === 'DARK_STORE') window.location.href = 'darkstore.html';
    else if (role === 'ADMIN') window.location.href = 'admin.html';
  }, 400);
}

async function manualLoginSubmit() {
  const email = document.getElementById('login-email-input')?.value;
  const role = document.getElementById('login-role-select')?.value || 'CUSTOMER';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });

    if (res.ok) {
      const data = await res.json();
      setAuthUser(data.user);
      localStorage.setItem('auth_token', data.token);
      showToast(`Login successful! Welcome ${data.user.name}`, 'success');
      updateTokenInspector();
      highlightActivePersona();
    }
  } catch (e) {
    showToast('Login failed', 'error');
  }
}

// Window exports
window.activatePersona = activatePersona;
window.manualLoginSubmit = manualLoginSubmit;
