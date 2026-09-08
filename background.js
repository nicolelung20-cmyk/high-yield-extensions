// Background Service Worker for Email Finder

const CONFIG = {
  hunterApiKey: null,
  clearbitApiKey: null,
  emailsFound: [],
  apiProvider: 'hunter', // Primary provider
  creditsUsed: 0,
  creditsLimit: 1000 // Free tier
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['hunterApiKey', 'clearbitApiKey', 'creditsLimit'], (result) => {
    if (!result.hunterApiKey && !result.clearbitApiKey) {
      chrome.runtime.openOptionsPage();
    }
  });
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findEmail') {
    findEmailAddress(request.name, request.domain)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'verifyEmail') {
    verifyEmail(request.email, request.domain)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'domainSearch') {
    searchDomain(request.domain)
      .then(result => sendResponse({ success: true, emails: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({
      hunterApiKey: request.hunterApiKey,
      clearbitApiKey: request.clearbitApiKey,
      creditsLimit: request.creditsLimit,
      apiProvider: request.apiProvider
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(
      ['hunterApiKey', 'clearbitApiKey', 'creditsLimit', 'creditsUsed', 'apiProvider'],
      (result) => {
        sendResponse({
          hunterApiKey: result.hunterApiKey || '',
          clearbitApiKey: result.clearbitApiKey || '',
          creditsLimit: result.creditsLimit || 1000,
          creditsUsed: result.creditsUsed || 0,
          apiProvider: result.apiProvider || 'hunter'
        });
      }
    );
    return true;
  }

  if (request.action === 'getHistory') {
    chrome.storage.local.get(['emailHistory'], (result) => {
      sendResponse({ history: result.emailHistory || [] });
    });
    return true;
  }
});

// Main email finding function
async function findEmailAddress(name, domain) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['hunterApiKey', 'clearbitApiKey', 'apiProvider'], async (result) => {
      const provider = result.apiProvider || 'hunter';
      const hunterKey = result.hunterApiKey;
      const clearbitKey = result.clearbitApiKey;

      try {
        let emailData;

        if (provider === 'hunter' && hunterKey) {
          emailData = await callHunterAPI(hunterKey, name, domain);
        } else if (clearbitKey) {
          emailData = await callClearbitAPI(clearbitKey, name, domain);
        } else {
          // Fallback: pattern-based guessing
          emailData = await guessEmailPattern(name, domain);
        }

        // Save to history
        saveToHistory({
          name,
          domain,
          email: emailData.email,
          confidence: emailData.confidence,
          timestamp: new Date().toISOString()
        });

        resolve(emailData);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Hunter.io API call
async function callHunterAPI(apiKey, firstName, domain) {
  const url = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&domain=${domain}`;

  const response = await fetch(url + `&api_key=${apiKey}`);

  if (!response.ok) {
    throw new Error('Hunter.io API error');
  }

  const data = await response.json();

  if (data.data && data.data.email) {
    return {
      email: data.data.email,
      confidence: data.data.confidence || 0.85,
      source: 'Hunter',
      verified: data.data.status === 'verified'
    };
  }

  throw new Error('Email not found');
}

// Clearbit API call
async function callClearbitAPI(apiKey, name, domain) {
  const response = await fetch(`https://person-stream.clearbit.com/v2/combined/find?email=${name}@${domain}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Clearbit API error');
  }

  const data = await response.json();

  if (data.person && data.person.email) {
    return {
      email: data.person.email,
      confidence: 0.95,
      source: 'Clearbit',
      verified: true
    };
  }

  throw new Error('Email not found');
}

// Email verification
async function verifyEmail(email, domain) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['hunterApiKey'], async (result) => {
      const apiKey = result.hunterApiKey;

      if (!apiKey) {
        reject(new Error('Hunter API key not configured'));
        return;
      }

      try {
        const response = await fetch(
          `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`
        );

        const data = await response.json();

        resolve({
          email: email,
          valid: data.data && data.data.status === 'valid',
          status: data.data?.status || 'unknown',
          type: data.data?.type || 'unknown',
          verified: true
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Domain email search
async function searchDomain(domain) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['hunterApiKey'], async (result) => {
      const apiKey = result.hunterApiKey;

      if (!apiKey) {
        reject(new Error('Hunter API key not configured'));
        return;
      }

      try {
        const response = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`
        );

        const data = await response.json();

        const emails = (data.data?.emails || []).map(e => ({
          email: e.value,
          type: e.type,
          confidence: e.confidence
        }));

        resolve(emails);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Guess email pattern
async function guessEmailPattern(name, domain) {
  const patterns = [
    `${name}@${domain}`,
    `${name.charAt(0)}.${name}@${domain}`,
    `${name.split(' ')[0]}.${name.split(' ')[1]}@${domain}`,
    `${name.split(' ')[0]}@${domain}`
  ];

  return {
    email: patterns[0],
    confidence: 0.6,
    source: 'Guessed Pattern',
    verified: false
  };
}

// Save to history
function saveToHistory(entry) {
  chrome.storage.local.get(['emailHistory'], (result) => {
    const history = result.emailHistory || [];
    history.unshift(entry);
    // Keep only last 100 searches
    if (history.length > 100) {
      history.pop();
    }
    chrome.storage.local.set({ emailHistory: history });
  });
}
