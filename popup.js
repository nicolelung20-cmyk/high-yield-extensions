// Popup Script

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tabName = e.target.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'history') loadHistory();
  });
});

// Load settings
chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
  if (response) {
    document.getElementById('hunterKey').value = response.hunterApiKey || '';
    document.getElementById('clearbitKey').value = response.clearbitApiKey || '';
    document.getElementById('apiProvider').value = response.apiProvider || 'hunter';
    document.getElementById('creditsLimit').value = response.creditsLimit || 1000;
    document.getElementById('creditsUsed').value = response.creditsUsed || 0;
    updateCreditsBar(response.creditsUsed || 0, response.creditsLimit || 1000);
  }
});

// Find email
document.getElementById('findBtn').addEventListener('click', async () => {
  const firstName = document.getElementById('firstName').value;
  const domain = document.getElementById('domain').value;

  if (!firstName || !domain) {
    showStatus('finderStatus', 'Please enter name and domain.', 'error');
    return;
  }

  showStatus('finderStatus', 'Searching...', 'info');
  document.getElementById('findBtn').disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'findEmail',
      name: firstName,
      domain: domain
    });

    if (response.success) {
      showStatus('finderStatus', `Found: ${response.email} (${Math.round(response.confidence * 100)}% confidence)`, 'success');
      document.getElementById('firstName').value = '';
      document.getElementById('domain').value = '';
    } else {
      showStatus('finderStatus', `Error: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus('finderStatus', `Error: ${error.message}`, 'error');
  } finally {
    document.getElementById('findBtn').disabled = false;
  }
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const hunterKey = document.getElementById('hunterKey').value;
  const clearbitKey = document.getElementById('clearbitKey').value;
  const apiProvider = document.getElementById('apiProvider').value;
  const creditsLimit = parseInt(document.getElementById('creditsLimit').value);

  if (!hunterKey && !clearbitKey) {
    showStatus('settingsStatus', 'Please enter at least one API key.', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'saveSettings',
    hunterApiKey: hunterKey,
    clearbitApiKey: clearbitKey,
    apiProvider: apiProvider,
    creditsLimit: creditsLimit
  }, (response) => {
    if (response.success) {
      showStatus('settingsStatus', 'Settings saved!', 'success');
    } else {
      showStatus('settingsStatus', 'Error saving settings.', 'error');
    }
  });
});

// Load history
function loadHistory() {
  chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
    const historyList = document.getElementById('historyList');
    const history = response.history || [];

    if (history.length === 0) {
      historyList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px 0; font-size: 12px;">No history yet</p>';
      return;
    }

    historyList.innerHTML = history.map((item, idx) => `
      <div class="history-item" data-index="${idx}">
        <div class="history-email">${item.email}</div>
        <div class="history-meta">${item.name} @ ${item.domain}</div>
        <div class="history-meta" style="margin-top: 2px;">Confidence: ${Math.round(item.confidence * 100)}%</div>
      </div>
    `).join('');

    document.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const email = item.querySelector('.history-email').textContent;
        navigator.clipboard.writeText(email);
        alert('Email copied: ' + email);
      });
    });
  });
}

function updateCreditsBar(used, limit) {
  const percentage = (used / limit) * 100;
  document.getElementById('creditsUsedBar').style.width = percentage + '%';
  document.getElementById('creditsText').textContent = `${used} / ${limit}`;
}

function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
}
