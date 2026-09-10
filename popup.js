// Popup Script

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tabName = e.target.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'dashboard') updateDashboard();
  });
});

// Load and display stats
function updateDashboard() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (response) {
      document.getElementById('earningsValue').textContent = (response.earnings / 100).toFixed(2);
      document.getElementById('dataPointsValue').textContent = response.dataPoints.toLocaleString();
      
      // Simulate breakdown (in real app, get from server)
      const totalEarnings = response.earnings / 100;
      document.getElementById('pvEarnings').textContent = (totalEarnings * 0.4).toFixed(2);
      document.getElementById('tosEarnings').textContent = (totalEarnings * 0.35).toFixed(2);
      document.getElementById('engEarnings').textContent = (totalEarnings * 0.25).toFixed(2);
    }
  });
}

// Load settings
chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
  if (response) {
    document.getElementById('apiKey').value = response.apiKey || '';
    document.getElementById('privacyMode').checked = response.privacyMode !== false;
  }
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;

  if (!apiKey) {
    showStatus('settingsStatus', 'Please enter your API key.', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'saveSettings',
    apiKey: apiKey,
    privacyMode: true
  }, (response) => {
    if (response.success) {
      showStatus('settingsStatus', 'Settings saved! Earning started.', 'success');
    } else {
      showStatus('settingsStatus', 'Error saving settings.', 'error');
    }
  });
});

// Delete data
document.getElementById('deleteDataBtn').addEventListener('click', () => {
  if (confirm('Are you sure? This will delete all your analytics data.')) {
    chrome.storage.local.clear();
    showStatus('privacyStatus', 'All data deleted.', 'success');
  }
});

// Listen for stats updates from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    updateDashboard();
  }
});

// Update dashboard on popup open
window.addEventListener('load', updateDashboard);

function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
}
