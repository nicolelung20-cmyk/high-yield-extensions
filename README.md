# AI Email Assistant - Chrome Extension

## Features
- 🤖 Auto-compose professional emails with AI
- 📧 Direct Gmail integration
- 🎯 Multiple tone options (professional, friendly, formal, casual)
- 🔑 Support for OpenAI GPT-3.5 and Claude AI
- ⚡ Fast generation with fallback API support
- 💾 Secure API key storage

## Installation

1. Clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select this extension folder

## Setup

### Get API Keys

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste into extension settings

**Claude:**
1. Go to https://console.anthropic.com/
2. Create a new API key
3. Copy and paste into extension settings

## Usage

1. Open Gmail
2. Click "Compose" to start a new email
3. Click the blue "✨ AI Write" button in the toolbar
4. Describe what you want to write
5. Select the tone
6. Click "Generate" and your email will appear

## Revenue Model

- **Monthly Subscription:** $9.99/month (basic), $19.99/month (pro with more generations)
- **Target Users:** 10,000+ users = $100K-200K/month minimum
- **Monetization:** Premium tiers, team plans, API usage

## Building & Deployment

### Local Testing
```bash
# Load in Chrome for testing
chrome://extensions/ -> Load unpacked -> Select folder
```

### Chrome Web Store
1. Create developer account ($5)
2. Upload ZIP file
3. Fill in description and screenshots
4. Submit for review (24-48 hours)

## Files
- `manifest.json` - Extension configuration
- `background.js` - API handling and core logic
- `content.js` - Gmail DOM integration
- `popup.html/js` - UI and settings

## Support
For issues or questions, open an issue on this repository.
