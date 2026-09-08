// Background Service Worker - Anonymous Traffic Monetizer

const CONFIG = {
  userId: generateUserId(),
  sessionStart: Date.now(),
  apiKey: null,
  earnings: 0,
  dataPoints: [],
  batchSize: 50,
  sendInterval: 300000, // 5 minutes
  privacyMode: true // Always anonymized
};

function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['apiKey', 'privacyMode', 'earnings'], (result) => {
    CONFIG.apiKey = result.apiKey || null;
    CONFIG.privacyMode = result.privacyMode !== false;
    CONFIG.earnings = result.earnings || 0;
    
    if (!CONFIG.apiKey) {
      chrome.runtime.openOptionsPage();
    } else {
      startTracking();
    }
  });
});

// Track tab changes and page visits
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    trackPageVisit(tab.url);
  });
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    trackPageVisit(details.url);
  }
});

// Track time on page
let pageStartTime = Date.now();
let currentPageDomain = null;

chrome.tabs.onActivated.addListener(() => {
  pageStartTime = Date.now();
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({
      apiKey: request.apiKey,
      privacyMode: request.privacyMode
    }, () => {
      CONFIG.apiKey = request.apiKey;
      CONFIG.privacyMode = request.privacyMode;
      if (request.apiKey) {
        startTracking();
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getStats') {
    chrome.storage.local.get(['totalDataPoints', 'earnings', 'lastPayment'], (result) => {
      sendResponse({
        dataPoints: result.totalDataPoints || 0,
        earnings: result.earnings || CONFIG.earnings,
        lastPayment: result.lastPayment || null
      });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiKey', 'privacyMode'], (result) => {
      sendResponse({
        apiKey: result.apiKey || '',
        privacyMode: result.privacyMode !== false
      });
    });
    return true;
  }
});

// Main tracking function
function trackPageVisit(url) {
  try {
    const domain = new URL(url).hostname;
    currentPageDomain = domain;

    const dataPoint = {
      domain: domain,
      timestamp: Date.now(),
      timeSpent: calculateTimeOnPage(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      scrollDepth: 0,
      clicks: 0
    };

    CONFIG.dataPoints.push(dataPoint);

    // Send batch when threshold reached
    if (CONFIG.dataPoints.length >= CONFIG.batchSize) {
      sendBatchData();
    }
  } catch (error) {
    console.error('Error tracking page:', error);
  }
}

function calculateTimeOnPage() {
  const timeSpent = Date.now() - pageStartTime;
  return Math.round(timeSpent / 1000); // Convert to seconds
}

// Send batch data to server
async function sendBatchData() {
  if (CONFIG.dataPoints.length === 0 || !CONFIG.apiKey) {
    return;
  }

  const batch = CONFIG.dataPoints.splice(0, CONFIG.batchSize);

  try {
    const response = await fetch('https://analytics-api.example.com/v1/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
      },
      body: JSON.stringify({
        userId: CONFIG.userId,
        privacyMode: CONFIG.privacyMode,
        dataPoints: batch,
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      // Update earnings
      if (result.earnings) {
        CONFIG.earnings += result.earnings;
        chrome.storage.local.get(['totalDataPoints'], (res) => {
          chrome.storage.local.set({
            totalDataPoints: (res.totalDataPoints || 0) + batch.length,
            earnings: CONFIG.earnings
          });
        });
      }

      // Notify popup of update
      chrome.runtime.sendMessage({
        action: 'updateStats',
        earnings: CONFIG.earnings
      }).catch(() => {}); // Ignore if popup not open
    }
  } catch (error) {
    console.error('Error sending analytics data:', error);
    // Re-add batch for retry
    CONFIG.dataPoints.unshift(...batch);
  }
}

// Periodic batch send
function startTracking() {
  if (!CONFIG.apiKey) return;

  // Send batches every 5 minutes
  setInterval(() => {
    sendBatchData();
  }, CONFIG.sendInterval);

  // Also send on browser close
  window.addEventListener('beforeunload', () => {
    sendBatchData();
  });
}

// Analyze scroll depth
chrome.tabs.onActivated.addListener(() => {
  chrome.tabs.executeScript({
    code: `
      let maxScroll = 0;
      window.addEventListener('scroll', () => {
        const scroll = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        maxScroll = Math.max(maxScroll, scroll);
        chrome.runtime.sendMessage({
          action: 'updateScrollDepth',
          depth: Math.round(maxScroll)
        });
      });
    `
  }).catch(() => {});
});

// Track clicks for engagement
chrome.tabs.onActivated.addListener(() => {
  chrome.tabs.executeScript({
    code: `
      let clickCount = 0;
      document.addEventListener('click', () => {
        clickCount++;
        chrome.runtime.sendMessage({
          action: 'updateClicks',
          clicks: clickCount
        });
      });
    `
  }).catch(() => {});
});
