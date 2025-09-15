# 📱 WACAO!

**WhatsApp Chat Assistant & Organizer** - AI-powered summarization and translation for WhatsApp Web

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen)](https://chrome.google.com/webstore) *(Coming Soon)*

## 🌟 Features

- **📄 Smart Summarization**: Get AI-generated key points from your WhatsApp chats
- **🌐 Real-time Translation**: Translate messages and reply in any language
- **🔒 Privacy-First**: All AI processing happens locally in your browser
- **⚡ No API Keys**: Uses Chrome's built-in Gemini Nano AI models
- **🎯 Zero Data Collection**: Your conversations never leave your device

## 🚀 Quick Start

### Option 1: Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) *(Coming Soon)*
2. Click "Add to Chrome"
3. Enable required Chrome AI flags (see setup below)
4. Start using on WhatsApp Web!

### Option 2: Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. Enable Chrome AI flags (see setup below)

## ⚙️ Required Setup

Enable these Chrome flags by visiting `chrome://flags/`:

```
1. "Enables optimization guide on device" or #optimization-guide-on-device → "Enabled"
2. "Prompt API for Gemini Nano" or #prompt-api-for-gemini-nano → "Enabled"
3. "Summarization API for Gemini Nano" or #summarization-api-for-gemini-nano → "Enabled"
4. "Experimental translation API" or #translation-api → "Enabled"
5. "Translation API" → "Enabled"
```

**Then restart Chrome completely.**

## 📋 How to Use

### Summarization
1. Open WhatsApp Web and select any chat
2. Click the WACAO! extension icon to open the side panel
3. Choose the "Summary" tab
4. Select number of messages (20 or 50)
5. Click "🤖 Summarize Active Chat"

### Translation
1. Open WhatsApp Web with an active conversation
2. Open the WACAO! side panel
3. Switch to the "Translator" tab
4. Set your preferred language
5. Click "🌐 Translate Last Message"
6. Use the reply box to respond in your language (auto-translated)

## 🛠️ Technical Details

- **AI Models**: Chrome's built-in Gemini Nano (will download Gemini Nano on first use)
- **Supported Languages**: 12+ languages including English, Spanish, French, German, Chinese, Japanese, Arabic, Hindi
- **Requirements**: Chrome 138+, 4GB+ VRAM, free storage for model download
- **Privacy**: 100% local processing, no external servers

## 🔒 Privacy & Security

- **No Data Collection**: Messages are processed locally only
- **No External APIs**: Uses Chrome's built-in AI exclusively
- **No Network Requests**: Extension works completely offline after AI model download
- **Minimal Permissions**: Only accesses WhatsApp Web domain

## 🐛 Troubleshooting

**"Summarizer API not available"**
- Ensure all Chrome flags are enabled and Chrome is restarted
- Check you're using Chrome 138+ on a supported device

**"No active chat found"**
- Make sure you have a WhatsApp chat open and selected
- Scroll to the bottom of the chat for best results

**AI model download issues**
- Ensure there is enough free storage space
- Use unmetered internet connection for initial download
- Model downloads once and works offline thereafter

## 🤝 Contributing

This is an open-source project. Feel free to:
- Report issues or bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️  by NueFunnel**
