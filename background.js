// Background Service Worker for AI Email Assistant

const CONFIG = {
  openaiKey: null,
  claudeKey: null,
  apiProvider: 'openai', // fallback to openai
  maxRetries: 3,
  timeout: 30000
};

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['openaiKey', 'claudeKey', 'apiProvider'], (result) => {
    if (!result.openaiKey && !result.claudeKey) {
      chrome.runtime.openOptionsPage();
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateEmail') {
    generateEmailWithAI(request.prompt, request.tone || 'professional')
      .then(email => sendResponse({ success: true, email }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({
      openaiKey: request.openaiKey,
      claudeKey: request.claudeKey,
      apiProvider: request.apiProvider,
      emailTone: request.emailTone
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['openaiKey', 'claudeKey', 'apiProvider', 'emailTone'], (result) => {
      sendResponse({
        openaiKey: result.openaiKey || '',
        claudeKey: result.claudeKey || '',
        apiProvider: result.apiProvider || 'openai',
        emailTone: result.emailTone || 'professional'
      });
    });
    return true;
  }
});

// Main AI email generation function
async function generateEmailWithAI(prompt, tone) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['openaiKey', 'claudeKey', 'apiProvider'], async (result) => {
      const provider = result.apiProvider || 'openai';
      const openaiKey = result.openaiKey;
      const claudeKey = result.claudeKey;

      try {
        let email;

        if (provider === 'claude' && claudeKey) {
          email = await callClaudeAPI(claudeKey, prompt, tone);
        } else if (openaiKey) {
          email = await callOpenAIAPI(openaiKey, prompt, tone);
        } else {
          throw new Error('No API keys configured. Please set up your API keys in settings.');
        }

        resolve(email);
      } catch (error) {
        // Fallback to other provider
        if (provider === 'claude' && openaiKey) {
          try {
            const email = await callOpenAIAPI(openaiKey, prompt, tone);
            resolve(email);
          } catch (fallbackError) {
            reject(fallbackError);
          }
        } else if (claudeKey) {
          try {
            const email = await callClaudeAPI(claudeKey, prompt, tone);
            resolve(email);
          } catch (fallbackError) {
            reject(fallbackError);
          }
        } else {
          reject(error);
        }
      }
    });
  });
}

// Call OpenAI API
async function callOpenAIAPI(apiKey, prompt, tone) {
  const systemPrompt = `You are a professional email writer. Write concise, ${tone} emails based on user prompts. Return only the email body without subject line.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Claude API
async function callClaudeAPI(apiKey, prompt, tone) {
  const systemPrompt = `You are a professional email writer. Write concise, ${tone} emails based on user prompts. Return only the email body without subject line.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
