// LinkedIn Content Script - Extract profile information and add Email Finder button

const PROFILE_BUTTON_ID = 'email-finder-linkedin-btn';

function initializeLinkedInIntegration() {
  const observer = new MutationObserver(() => {
    const profileHeader = document.querySelector('h1') || document.querySelector('[data-test-id="profile-topcard-headline"]');
    if (profileHeader && !document.getElementById(PROFILE_BUTTON_ID)) {
      injectEmailFinderButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function injectEmailFinderButton() {
  const profileTopCard = document.querySelector('[data-test-id="profile-topcard"]') || 
                         document.querySelector('.profile-card') ||
                         document.body;

  const button = document.createElement('button');
  button.id = PROFILE_BUTTON_ID;
  button.textContent = '📧 Find Email';
  button.style.cssText = `
    background: linear-gradient(135deg, #0a66c2 0%, #00a4ef 100%);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
    margin: 10px 0;
    font-size: 13px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.3s;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });

  button.addEventListener('click', () => {
    extractProfileAndFindEmail();
  });

  profileTopCard.appendChild(button);
}

function extractProfileAndFindEmail() {
  // Extract name
  const nameElement = document.querySelector('h1');
  const fullName = nameElement ? nameElement.textContent.trim() : 'Unknown';
  const firstName = fullName.split(' ')[0];

  // Extract company domain (simplified)
  const aboutSection = document.querySelector('[data-test-id="about-section"]') ||
                       document.querySelector('.pv-about__summary') ||
                       document.body.innerText;
  
  let domain = extractDomainFromText(aboutSection.textContent || aboutSection);

  if (!domain) {
    alert('Could not extract company website. Please enter domain manually.');
    promptForDomain(firstName);
    return;
  }

  findEmailAndShow(firstName, domain, fullName);
}

function extractDomainFromText(text) {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z0-9]{2,})/gi;
  const matches = text.match(urlRegex);
  
  if (matches && matches.length > 0) {
    let domain = matches[0].replace(/https?:\/\//g, '').replace(/www\./g, '');
    if (domain.includes('/')) {
      domain = domain.split('/')[0];
    }
    return domain;
  }
  return null;
}

function promptForDomain(firstName) {
  const domain = prompt('Enter company domain (e.g., acme.com):', '');
  if (domain) {
    findEmailAndShow(firstName, domain, firstName);
  }
}

function findEmailAndShow(firstName, domain, fullName) {
  // Show loading dialog
  showLoadingDialog();

  chrome.runtime.sendMessage({
    action: 'findEmail',
    name: firstName,
    domain: domain
  }, (response) => {
    closeLoadingDialog();

    if (response.success) {
      showEmailResultDialog(response.email, response.confidence, response.verified, fullName, domain);
    } else {
      alert(`Error: ${response.error}`);
    }
  });
}

function showLoadingDialog() {
  const dialog = document.createElement('div');
  dialog.id = 'email-finder-loading';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 100000;
    text-align: center;
    min-width: 300px;
  `;
  dialog.innerHTML = `
    <div style="font-size: 14px; color: #666; margin-bottom: 15px;">Searching for email...</div>
    <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #0a66c2; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `;
  document.body.appendChild(dialog);
}

function closeLoadingDialog() {
  const dialog = document.getElementById('email-finder-loading');
  if (dialog) {
    document.body.removeChild(dialog);
  }
}

function showEmailResultDialog(email, confidence, verified, name, domain) {
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 100000;
    min-width: 400px;
  `;

  const confidenceColor = confidence > 0.9 ? '#28a745' : confidence > 0.7 ? '#ffc107' : '#dc3545';
  const verifiedBadge = verified ? '✓ Verified' : '? Unverified';

  dialog.innerHTML = `
    <h2 style="margin-top: 0; color: #0a66c2;">Email Found!</h2>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px;">${email}</div>
      <div style="color: ${confidenceColor}; font-size: 13px; margin-bottom: 5px;">${verifiedBadge}</div>
      <div style="color: #666; font-size: 12px;">Confidence: ${Math.round(confidence * 100)}%</div>
    </div>
    <div style="margin-bottom: 15px; font-size: 12px; color: #666;">
      <strong>Profile:</strong> ${name}<br>
      <strong>Domain:</strong> ${domain}
    </div>
    <div style="display: flex; gap: 10px;">
      <button id="copy-email-btn" style="flex: 1; padding: 10px; background: #0a66c2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Copy Email</button>
      <button id="verify-email-btn" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Verify</button>
      <button id="close-dialog-btn" style="flex: 1; padding: 10px; background: #e9ecef; color: #333; border: none; border-radius: 6px; cursor: pointer;">Close</button>
    </div>
  `;

  document.body.appendChild(dialog);

  document.getElementById('copy-email-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(email);
    alert('Email copied to clipboard!');
    document.body.removeChild(dialog);
  });

  document.getElementById('verify-email-btn').addEventListener('click', () => {
    verifyEmailAndShow(email, domain, dialog);
  });

  document.getElementById('close-dialog-btn').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
}

function verifyEmailAndShow(email, domain, dialog) {
  showLoadingDialog();

  chrome.runtime.sendMessage({
    action: 'verifyEmail',
    email: email,
    domain: domain
  }, (response) => {
    closeLoadingDialog();

    if (response.success) {
      alert(`Email Verification:\nEmail: ${email}\nValid: ${response.valid ? 'Yes ✓' : 'No ✗'}\nStatus: ${response.status}`);
    } else {
      alert(`Verification error: ${response.error}`);
    }
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLinkedInIntegration);
} else {
  initializeLinkedInIntegration();
}
