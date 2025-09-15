// WhatsApp Web DOM Selectors
// Discovered through Playwright exploration on August 30, 2025

const WHATSAPP_SELECTORS = {
  // Main chat container - where all messages are displayed
  chatContainer: {
    primary: '#main .copyable-area',
    fallbacks: [
      '[role="main"] .copyable-area',
      '.copyable-area',
      '#main'
    ]
  },
  
  // Individual message bubbles
  messageRows: {
    primary: '.message-in, .message-out',
    fallbacks: [
      '[class*="message-"]', 
      '.copyable-text',
      'div[class*="copyable"]'
    ]
  },
  
  // Message text content
  messageText: {
    primary: '.copyable-text .selectable-text',
    fallbacks: [
      '.selectable-text',
      '.copyable-text span',
      'span[dir="ltr"]',
      'span[dir="rtl"]'
    ]
  },
  
  // Sender information (name/timestamp data)
  senderInfo: {
    primary: '[data-pre-plain-text]',
    fallbacks: [
      '[class*="copyable-text"][data-pre-plain-text]',
      '.message-in [data-pre-plain-text]',
      '.message-out [data-pre-plain-text]'
    ]
  },
  
  // Active chat indicator (to ensure we're in a chat)
  activeChatIndicators: {
    primary: '#main header',
    fallbacks: [
      '[data-testid="conversation-header"]',
      '#main .copyable-area',
      '.copyable-area'
    ]
  },

  // Chat list and selection
  chatList: {
    primary: '#pane-side [data-testid="chat"]',
    fallbacks: [
      '[data-testid="chat"]',
      '#pane-side > div > div > div',
      '.chatlist-container [role="listitem"]'
    ]
  },

  chatListItem: {
    primary: '[data-testid="cell-frame-container"]',
    fallbacks: [
      '[data-testid="chat"]',
      '[role="gridcell"]',
      '.chatlist-container > div'
    ]
  },

  chatName: {
    primary: '[data-testid="conversation-info-header"] [title]',
    fallbacks: [
      '[title][dir="auto"]',
      'span[dir="auto"][title]',
      '.chat-title'
    ]
  },

  // Message input and sending
  messageInput: {
    primary: '[data-testid="conversation-compose-box-input"]',
    fallbacks: [
      '[contenteditable="true"][data-tab]',
      '#main footer [contenteditable="true"]',
      '[data-lexical-text="true"]'
    ]
  },

  sendButton: {
    primary: '[data-testid="send"]',
    fallbacks: [
      'span[data-icon="send"]',
      '[aria-label*="Send"]',
      'button[type="submit"]'
    ]
  },

  // New message detection for monitoring
  messageContainer: {
    primary: '#main [data-testid="msg-container"]',
    fallbacks: [
      '[data-testid="msg-container"]',
      '.message-in, .message-out',
      '#main .copyable-text'
    ]
  },

  lastMessage: {
    primary: '#main [data-testid="msg-container"]:last-child',
    fallbacks: [
      '.copyable-text:last-child',
      '.message-in:last-child, .message-out:last-child'
    ]
  },

  // Chat header for active chat detection
  chatHeader: {
    primary: '#main header [data-testid="conversation-info-header"]',
    fallbacks: [
      '#main header',
      '[data-testid="conversation-header"]'
    ]
  },

  activeChat: {
    primary: '[data-testid="chat"][aria-selected="true"]',
    fallbacks: [
      '.chat-active',
      '[data-testid="chat"].selected'
    ]
  }
};

// Utility function to try selectors with fallbacks
function trySelectorsWithFallbacks(document, selectorConfig) {
  // Try primary selector first
  let elements = document.querySelectorAll(selectorConfig.primary);
  if (elements.length > 0) {
    return { elements, usedSelector: selectorConfig.primary };
  }
  
  // Try fallback selectors
  for (const fallback of selectorConfig.fallbacks || []) {
    elements = document.querySelectorAll(fallback);
    if (elements.length > 0) {
      return { elements, usedSelector: fallback };
    }
  }
  
  return { elements: [], usedSelector: null };
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WHATSAPP_SELECTORS, trySelectorsWithFallbacks };
}