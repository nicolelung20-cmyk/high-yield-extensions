// Popup Script

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tabName = e.target.getAttribute('data-tab');
    
    // Remove active from all tabs and buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active to clicked button and corresponding tab
    e.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
  });
});

// Load settings on popup open
chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
  if (response) {
    document.getElementById('openaiKey').value = response.openaiKey || '';
    document.getElementById('claudeKey').value = response.claudeKey || '';
    document.getElementById('apiProvider').value = response.apiProvider || 'openai';
    document.getElementById('emailTone').value = response.emailTone || 'professional';
  }
});

// Save settings
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const openaiKey = document.getElementById('openaiKey').value;
  const claudeKey = document.getElementById('claudeKey').value;
  const apiProvider = document.getElementById('apiProvider').value;
  const emailTone = document.getElementById('emailTone').value;

  if (!openaiKey && !claudeKey) {
    showStatus('settingsStatus', 'Please enter at least one API key.', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'saveSettings',
    openaiKey,
    claudeKey,
    apiProvider,
    emailTone
  }, (response) => {
    if (response.success) {
      showStatus('settingsStatus', 'Settings saved successfully!', 'success');
    } else {
      showStatus('settingsStatus', 'Error saving settings.', 'error');
    }
  });
});

// Quick generate
document.getElementById('quickGenerateBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('quickPrompt').value;
  const tone = document.getElementById('quickTone').value;

  if (!prompt.trim()) {
    showStatus('quickStatus', 'Please enter a prompt.', 'error');
    return;
  }

  showStatus('quickStatus', 'Generating...', 'info');
  document.getElementById('quickGenerateBtn').disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateEmail',
      prompt,
      tone
    });

    if (response.success) {
      showStatus('quickStatus', 'Email generated! Check your Gmail compose area.', 'success');
      document.getElementById('quickPrompt').value = '';
    } else {
      showStatus('quickStatus', `Error: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus('quickStatus', `Error: ${error.message}`, 'error');
  } finally {
    document.getElementById('quickGenerateBtn').disabled = false;
  }
});

function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}
