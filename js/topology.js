// ==============================================================
// GarbaCholi.Express - Topology Visualizer & Kafka Event Stream Logic
// ==============================================================

let autoScroll = true;

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('topology');
  loadRecentKafkaEvents();

  const toggle = document.getElementById('autoscroll-toggle');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      autoScroll = e.target.checked;
    });
  }

  // Subscribe to live WebSocket event mesh
  eventMesh.subscribe((data) => {
    if (data.type === 'KAFKA_EVENT' && data.event) {
      appendEventLog(data.event);
    } else if (data.type === 'AGENT_DECISION') {
      appendEventLog({
        topic: `agent.${data.agent}.${data.action}`.toLowerCase(),
        timestamp: new Date().toISOString(),
        payload: data.decision || data
      });
    }
  });
});

async function loadRecentKafkaEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/kafka/events?limit=25`);
    if (res.ok) {
      const events = await res.json();
      events.forEach(e => appendEventLog(e));
    }
  } catch (e) {}
}

function appendEventLog(event) {
  const terminal = document.getElementById('event-terminal');
  if (!terminal) return;

  const timeStr = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  const topic = event.topic || 'system.event';
  const payloadStr = typeof event.payload === 'object' ? JSON.stringify(event.payload) : String(event.payload || '');

  const row = document.createElement('div');
  row.className = 'event-log-entry';
  row.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-topic">${topic}</span>
    <span class="log-msg">${payloadStr.substring(0, 140)}${payloadStr.length > 140 ? '...' : ''}</span>
  `;

  terminal.appendChild(row);

  if (autoScroll) {
    terminal.scrollTop = terminal.scrollHeight;
  }
}

function clearEventLogs() {
  const terminal = document.getElementById('event-terminal');
  if (terminal) terminal.innerHTML = '';
}

async function injectTestEvent() {
  try {
    const res = await fetch(`${API_BASE}/api/kafka/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: "garba.rush.simulated",
        key: `mesh_${Date.now()}`,
        payload: {
          event: "MIDNIGHT_GARBA_SURGE_DETECTED",
          venue: "Vastrapur GMDC Grounds",
          activeDancers: 14200,
          recommendation: "DISPATCH_EMERGENCY_DANDIYA_FLEET"
        }
      })
    });

    if (res.ok) {
      showToast('⚡ Injected test event into Kafka Event Mesh!', 'success');
    }
  } catch (e) {
    showToast('Failed to inject event', 'error');
  }
}

function refreshTopologyData() {
  loadRecentKafkaEvents();
  showToast('Topology mesh state refreshed', 'info');
}

// Window exports
window.clearEventLogs = clearEventLogs;
window.injectTestEvent = injectTestEvent;
window.refreshTopologyData = refreshTopologyData;
