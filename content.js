// Content Script for Gmail Integration

const EMAIL_BUTTON_ID = 'ai-email-assistant-btn';

// Inject AI button into Gmail compose area
function injectAIButton() {
  // Wait for Gmail to load
  const observer = new MutationObserver(() => {
    const composeArea = document.querySelector('div[role="dialog"]');
    if (composeArea && !document.getElementById(EMAIL_BUTTON_ID)) {
      addAIButtonToCompose(composeArea);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function addAIButtonToCompose(composeArea) {
  const toolbarArea = composeArea.querySelector('[role="toolbar"]');
  if (!toolbarArea) return;

  const button = document.createElement('button');
  button.id = EMAIL_BUTTON_ID;
  button.textContent = '✨ AI Write';
  button.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin: 0 8px;
    font-size: 12px;
  `;

  button.addEventListener('click', () => {
    showAIPromptDialog(composeArea);
  });

  toolbarArea.appendChild(button);
}

function showAIPromptDialog(composeArea) {
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    min-width: 400px;
  `;

  dialog.innerHTML = `
    <h2 style="margin-top: 0;">Write Email with AI</h2>
    <textarea id="ai-prompt" placeholder="Describe what you want to say..." style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: Arial, sans-serif;"></textarea>
    <div style="margin-top: 10px;">
      <label>Tone: 
        <select id="ai-tone" style="padding: 4px;">
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
        </select>
      </label>
    </div>
    <div style="margin-top: 15px; display: flex; gap: 10px;">
      <button id="ai-generate-btn" style="flex: 1; padding: 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Generate</button>
      <button id="ai-cancel-btn" style="flex: 1; padding: 10px; background: #ccc; color: black; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
    </div>
    <div id="ai-loading" style="display: none; margin-top: 10px; text-align: center; color: #667eea;">Generating...</div>
  `;

  document.body.appendChild(dialog);

  document.getElementById('ai-generate-btn').addEventListener('click', async () => {
    const prompt = document.getElementById('ai-prompt').value;
    const tone = document.getElementById('ai-tone').value;

    if (!prompt.trim()) {
      alert('Please enter what you want to write.');
      return;
    }

    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('ai-generate-btn').disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'generateEmail',
        prompt: prompt,
        tone: tone
      });

      if (response.success) {
        insertEmailIntoCompose(composeArea, response.email);
        document.body.removeChild(dialog);
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      document.getElementById('ai-loading').style.display = 'none';
      document.getElementById('ai-generate-btn').disabled = false;
    }
  });

  document.getElementById('ai-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
}

function insertEmailIntoCompose(composeArea, emailContent) {
  const bodyField = composeArea.querySelector('[role="textbox"][aria-label*="Message Body"]');
  if (bodyField) {
    bodyField.focus();
    document.execCommand('insertText', false, emailContent);
  }
}

// Start injection when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAIButton);
} else {
  injectAIButton();
}
