// WACAO! - Background Service Worker
// Orchestrates the flow for summarization and translation features

class WhatsAppAssistantBackground {
    constructor() {
        this.monitoringState = {
            isActive: false,
            chatId: null,
            baseLanguage: 'en',
            observer: null,
            tabId: null
        };
        this.init();
    }
    
    init() {
        this.setupSidePanelHandler();
        this.setupMessageHandlers();
        console.log('WACAO! background script initialized');
    }
    
    setupSidePanelHandler() {
        // Open side panel when extension icon is clicked
        chrome.action.onClicked.addListener(async (tab) => {
            try {
                await chrome.sidePanel.open({ tabId: tab.id });
                console.log('Side panel opened for tab:', tab.id);
            } catch (error) {
                console.error('Failed to open side panel:', error);
            }
        });
    }
    
    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Background received message:', message);
            
            // Handle async operations properly
            if (message.type === 'summarize_chat') {
                this.handleSummarizeChatRequest(message, sender, sendResponse);
                return true; // Keep the message channel open for async response
            } else if (message.type === 'scrape_messages_only') {
                this.handleScrapeMessagesOnly(message, sender, sendResponse);
                return true; // Keep the message channel open for async response
            } else if (message.type === 'summarize') {
                this.handleSummarizeText(message, sender, sendResponse);
                return true; // Keep the message channel open for async response
            }
            // Translation-related handlers
            else if (message.type === 'translate_last_message') {
                this.handleTranslateLastMessage(message, sender, sendResponse);
                return true;
            } else if (message.type === 'send_translated_message') {
                this.handleSendTranslatedMessage(message, sender, sendResponse);
                return true;
            }
        });
    }
    
    async handleSummarizeChatRequest(message, sender, sendResponse) {
        try {
            console.log('Processing summarize chat request for', message.messageCount, 'messages');
            
            // Step 1: Get the active tab (should be WhatsApp Web)
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!activeTab) {
                throw new Error('No active tab found');
            }
            
            // Step 2: Check if this is WhatsApp Web
            if (!activeTab.url.includes('web.whatsapp.com')) {
                throw new Error('Please navigate to WhatsApp Web (web.whatsapp.com) first');
            }
            
            console.log('Injecting content script into WhatsApp Web tab:', activeTab.id);
            
            // Step 3: Inject and execute the message scraping script
            const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: scrapeChatMessages,
                args: [message.messageCount]
            });
            
            console.log('Script execution results:', results);
            
            if (results && results[0]) {
                const scrapedData = results[0].result;
                console.log('Scraped data:', scrapedData);
                
                if (scrapedData && scrapedData.success) {
                    // Notify side panel that scraping is complete
                    this.sendToSidePanel({ type: 'scrapingComplete' });
                    
                    // Step 4: Send the scraped text for summarization
                    await this.handleSummarizeText({
                        type: 'summarize',
                        text: scrapedData.messages
                    }, sender, sendResponse);
                } else {
                    const errorMsg = scrapedData ? scrapedData.error : 'Script returned no data';
                    throw new Error(errorMsg || 'Failed to scrape messages');
                }
            } else {
                console.error('Script execution failed - no results returned');
                throw new Error('No results from content script - script may have failed to execute');
            }
            
        } catch (error) {
            console.error('Error in handleSummarizeChatRequest:', error);
            this.sendToSidePanel({
                type: 'summaryError',
                error: error.message
            });
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async handleScrapeMessagesOnly(message, sender, sendResponse) {
        try {
            console.log('Scraping messages only for', message.messageCount, 'messages');
            
            // Step 1: Get the active tab (should be WhatsApp Web)
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!activeTab) {
                throw new Error('No active tab found');
            }
            
            // Step 2: Check if this is WhatsApp Web
            if (!activeTab.url.includes('web.whatsapp.com')) {
                throw new Error('Please navigate to WhatsApp Web (web.whatsapp.com) first');
            }
            
            console.log('Injecting content script into WhatsApp Web tab:', activeTab.id);
            
            // Step 3: Inject and execute the message scraping script
            const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: scrapeChatMessages,
                args: [message.messageCount]
            });
            
            if (results && results[0] && results[0].result) {
                const scrapedData = results[0].result;
                console.log('Scraped data for side panel:', scrapedData);
                
                if (scrapedData && scrapedData.success) {
                    sendResponse({ 
                        success: true, 
                        messages: scrapedData.messages,
                        messageCount: scrapedData.messageCount
                    });
                } else {
                    const errorMsg = scrapedData ? scrapedData.error : 'Script returned no data';
                    sendResponse({ success: false, error: errorMsg });
                }
            } else {
                console.error('Script execution failed - no results returned');
                sendResponse({ success: false, error: 'No results from content script' });
            }
            
        } catch (error) {
            console.error('Error in handleScrapeMessagesOnly:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async handleSummarizeText(message, sender, sendResponse) {
        try {
            console.log('Starting AI summarization...');
            
            // Inject summarizer creation into the active tab (where user activation exists)
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: createSummarizerAndSummarize,
                args: [message.text]
            });
            
            if (results && results[0] && results[0].result) {
                const result = results[0].result;
                if (result.success) {
                    // Send result to side panel
                    this.sendToSidePanel({
                        type: 'summaryResult',
                        data: result.summary
                    });
                    sendResponse({ success: true, summary: result.summary });
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Failed to execute summarizer script');
            }
            
            
        } catch (error) {
            console.error('Error in handleSummarizeText:', error);
            this.sendToSidePanel({
                type: 'summaryError',
                error: error.message
            });
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async sendToSidePanel(message) {
        try {
            await chrome.runtime.sendMessage(message);
        } catch (error) {
            console.error('Failed to send message to side panel:', error);
        }
    }
    
    // Translation-related handlers
    async handleTranslateLastMessage(message, sender, sendResponse) {
        try {
            console.log('Getting last message for translation to:', message.baseLanguage);
            
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!activeTab) {
                throw new Error('No active tab found');
            }
            
            if (!activeTab.url.includes('web.whatsapp.com')) {
                throw new Error('Please navigate to WhatsApp Web (web.whatsapp.com) first');
            }
            
            console.log('Injecting content script to get last message');
            
            // First, just get the message without translation
            const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: getLastNonUserMessage
            });
            
            if (!results || !results[0] || !results[0].result) {
                throw new Error('Failed to get last message');
            }
            
            const messageResult = results[0].result;
            if (!messageResult.success) {
                throw new Error(messageResult.error);
            }
            
            const { sender, message: text } = messageResult;
            console.log('Got message from:', sender, 'Text:', text);
            
            // Now handle translation in the side panel context where user activation is preserved
            const translationResult = await this.performTranslation(text, sender, message.baseLanguage);
            
            sendResponse({ 
                success: true, 
                data: translationResult
            });
            
        } catch (error) {
            console.error('Error translating last message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    // Perform translation with user activation preserved in side panel context
    async performTranslation(text, sender, baseLanguage) {
        try {
            console.log('Performing translation with user activation for:', text);
            
            // Send to side panel to handle translation with user activation
            const translationResult = await chrome.runtime.sendMessage({
                type: 'perform_translation_with_activation',
                text: text,
                sender: sender,
                baseLanguage: baseLanguage
            });
            
            if (!translationResult.success) {
                throw new Error(translationResult.error);
            }
            
            return translationResult.data;
            
        } catch (error) {
            console.error('Error in performTranslation:', error);
            throw error;
        }
    }
    
    async handleSendTranslatedMessage(message, sender, sendResponse) {
        try {
            console.log('Translating and sending message:', message.text);
            
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!activeTab) {
                throw new Error('No active tab found');
            }
            
            if (!activeTab.url.includes('web.whatsapp.com')) {
                throw new Error('Please navigate to WhatsApp Web first');
            }
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: translateAndSendMessage,
                args: [message.text, message.sourceLanguage, message.targetLanguage]
            });
            
            if (results && results[0] && results[0].result) {
                const result = results[0].result;
                if (result.success) {
                    sendResponse({ success: true });
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Failed to send translated message');
            }
            
        } catch (error) {
            console.error('Error sending translated message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
}

// This function creates the summarizer and generates summary in WhatsApp Web context
async function createSummarizerAndSummarize(text) {
    try {
        console.log('Summarizer: Checking API availability...');
        
        // Check if Summarizer API exists
        if (!('Summarizer' in self)) {
            return {
                success: false,
                error: 'Summarizer API not available in this browser'
            };
        }
        
        // Check availability
        const availability = await self.Summarizer.availability();
        console.log('Summarizer availability:', availability);
        
        if (availability === 'no') {
            return {
                success: false,
                error: 'Summarizer is not available on this device'
            };
        }
        
        // Check user activation
        const hasUserActivation = navigator.userActivation?.isActive || false;
        console.log('User activation active:', hasUserActivation);
        
        if (availability === 'downloadable' && !hasUserActivation) {
            return {
                success: false,
                error: 'Model download requires user interaction. Please click the Summarize button to download the AI model.'
            };
        }
        
        // Create summarizer instance
        console.log('Creating summarizer...');
        const summarizer = await self.Summarizer.create({
            type: 'key-points',
            format: 'markdown',
            length: 'medium',
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    console.log(`Model download progress: ${Math.round(e.loaded * 100)}%`);
                });
            }
        });
        
        // Generate summary
        console.log('Generating summary for text length:', text.length);
        const summary = await summarizer.summarize(text);
        console.log('Summary generated successfully');
        
        // Clean up
        summarizer.destroy();
        
        return {
            success: true,
            summary: summary
        };
        
    } catch (error) {
        console.error('Summarizer error:', error);
        return {
            success: false,
            error: 'Failed to create summary: ' + error.message
        };
    }
}

// This function will be injected into the WhatsApp Web page - must be outside class
function scrapeChatMessages(messageCount) {
        console.log('Content script: Function called with messageCount:', messageCount);
        try {
            console.log('Content script: Starting to scrape', messageCount, 'messages');
            
            // Updated selectors based on current WhatsApp Web DOM structure
            const SELECTORS = {
                chatContainer: {
                    primary: '#main .copyable-area',
                    fallbacks: ['[role="main"] .copyable-area', '.copyable-area', '#main']
                },
                messageRows: {
                    primary: '.copyable-text[data-pre-plain-text]',
                    fallbacks: ['.copyable-text', '[data-pre-plain-text]']
                }
            };
            
            function trySelectors(selectorConfig) {
                let elements = document.querySelectorAll(selectorConfig.primary);
                if (elements.length > 0) {
                    return { elements, usedSelector: selectorConfig.primary };
                }
                
                for (const fallback of selectorConfig.fallbacks || []) {
                    elements = document.querySelectorAll(fallback);
                    if (elements.length > 0) {
                        return { elements, usedSelector: fallback };
                    }
                }
                
                return { elements: [], usedSelector: null };
            }
            
            // Step 1: Find the chat container
            const chatResult = trySelectors(SELECTORS.chatContainer);
            if (chatResult.elements.length === 0) {
                return {
                    success: false,
                    error: 'No active chat found. Please make sure you have a WhatsApp chat open.'
                };
            }
            
            console.log('Content script: Chat container found with selector:', chatResult.usedSelector);
            
            // Step 2: Find message elements
            const messageResult = trySelectors(SELECTORS.messageRows);
            if (messageResult.elements.length === 0) {
                return {
                    success: false,
                    error: 'No messages found in the active chat.'
                };
            }
            
            console.log('Content script: Found', messageResult.elements.length, 'message elements');
            
            // Step 3: Get the last N messages
            const allMessages = Array.from(messageResult.elements);
            const recentMessages = allMessages.slice(-messageCount);
            
            console.log('Content script: Processing', recentMessages.length, 'recent messages');
            
            // Step 4: Extract text from messages
            const extractedMessages = [];
            
            for (let i = 0; i < recentMessages.length; i++) {
                const messageElement = recentMessages[i];
                
                try {
                    // Get sender information from data-pre-plain-text attribute
                    const prePlainText = messageElement.getAttribute('data-pre-plain-text');
                    let senderInfo = '';
                    
                    if (prePlainText) {
                        // Extract sender name from the pre-plain-text attribute
                        // Format is usually "[timestamp] Name: " 
                        const senderMatch = prePlainText.match(/\] (.+?):/);
                        senderInfo = senderMatch ? senderMatch[1] : 'Unknown';
                    }
                    
                    // Get message text directly from the copyable-text element
                    const messageText = messageElement.textContent?.trim() || '';
                    
                    if (messageText) {
                        const formattedMessage = senderInfo ? `${senderInfo}: ${messageText}` : messageText;
                        extractedMessages.push(formattedMessage);
                    }
                    
                } catch (error) {
                    console.warn('Error processing message element:', error);
                    // Continue with next message
                }
            }
            
            if (extractedMessages.length === 0) {
                return {
                    success: false,
                    error: 'No readable messages found in the chat.'
                };
            }
            
            const combinedText = extractedMessages.join('\n\n');
            console.log('Content script: Extracted', extractedMessages.length, 'messages, total length:', combinedText.length);
            
            return {
                success: true,
                messages: combinedText,
                messageCount: extractedMessages.length
            };
            
        } catch (error) {
            console.error('Content script error:', error);
            console.error('Error stack:', error.stack);
            return {
                success: false,
                error: 'Failed to scrape messages: ' + error.message
            };
        }
    }

// Content script functions that will be injected into WhatsApp Web

// Function to get the last non-user message from active chat
function getLastNonUserMessage() {
    try {
        console.log('Getting last non-user message from active chat');
        
        // Use proven selectors from summarization feature
        const messageSelectors = {
            primary: '.copyable-text[data-pre-plain-text]',
            fallbacks: ['.copyable-text', '[data-pre-plain-text]']
        };
        
        // Find message container
        const chatContainer = document.querySelector('#main .copyable-area') || 
                             document.querySelector('[role="main"] .copyable-area');
        
        if (!chatContainer) {
            return {
                success: false,
                error: 'No active chat found. Please open a WhatsApp chat first.'
            };
        }
        
        // Try to find messages using proven selectors
        let messageElements = chatContainer.querySelectorAll(messageSelectors.primary);
        if (messageElements.length === 0) {
            for (const fallback of messageSelectors.fallbacks) {
                messageElements = chatContainer.querySelectorAll(fallback);
                if (messageElements.length > 0) {
                    console.log(`Found messages using fallback selector: ${fallback}`);
                    break;
                }
            }
        }
        
        if (messageElements.length === 0) {
            return {
                success: false,
                error: 'No messages found in the active chat.'
            };
        }
        
        // Get the last few messages and find the last non-user message
        const lastMessages = Array.from(messageElements).slice(-10); // Look at last 10 messages
        
        // Iterate backwards to find the last non-user message
        for (let i = lastMessages.length - 1; i >= 0; i--) {
            const messageElement = lastMessages[i];
            const prePlainText = messageElement.getAttribute('data-pre-plain-text');
            
            // Check if this is a message from another user (not sent by current user)
            // User's own messages typically don't have sender info in data-pre-plain-text
            // or have different positioning/styling
            let senderName = 'Unknown';
            let isFromOtherUser = false;
            
            if (prePlainText) {
                const senderMatch = prePlainText.match(/\] (.+?):/); 
                if (senderMatch) {
                    senderName = senderMatch[1];
                    isFromOtherUser = true; // Has sender info means it's from another user
                }
            }
            
            // Additional check: user's own messages are typically on the right side
            const messageParent = messageElement.closest('.message-in, .message-out');
            if (messageParent && messageParent.classList.contains('message-in')) {
                isFromOtherUser = true;
            }
            
            if (isFromOtherUser) {
                const messageText = messageElement.textContent?.trim() || '';
                if (messageText) {
                    return {
                        success: true,
                        message: messageText,
                        sender: senderName
                    };
                }
            }
        }
        
        return {
            success: false,
            error: 'No messages from other users found in recent messages.'
        };
        
    } catch (error) {
        console.error('Error getting last message:', error);
        return {
            success: false,
            error: 'Failed to get last message: ' + error.message
        };
    }
}

// Enhanced function to send a message in WhatsApp using proven execCommand approach
function sendWhatsAppMessage(messageText) {
    try {
        console.log('Attempting to send message:', messageText);
        
        // Find message input using multiple selectors (research-proven approach)
        const inputSelectors = [
            '[data-testid="conversation-compose-box-input"]',
            '#main div[contenteditable="true"]',
            '[contenteditable="true"][role="textbox"]',
            '#main .copyable-area [contenteditable="true"]',
            '[contenteditable="true"][data-tab]',
            '#main footer [contenteditable="true"]',
            '[data-lexical-text="true"]'
        ];
        
        let messageInput = null;
        for (const selector of inputSelectors) {
            messageInput = document.querySelector(selector);
            if (messageInput) {
                console.log('Found message input with selector:', selector);
                break;
            }
        }
        
        if (!messageInput) {
            throw new Error('Message input not found');
        }
        
        // Clear existing content, focus, and insert text using proven approach
        messageInput.focus();
        
        // Use execCommand for reliable text insertion (research shows this works best)
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, messageText);
        
        // Trigger events to make WhatsApp recognize the text
        const inputEvent = new Event('input', { bubbles: true });
        messageInput.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', { bubbles: true });
        messageInput.dispatchEvent(changeEvent);
        
        // Wait a moment for WhatsApp to process the input
        setTimeout(() => {
            // Find and click send button using multiple selectors
            const sendSelectors = [
                '[data-testid="send"]',
                '[data-icon="send"]',
                'span[data-icon="send"]',
                'button span[data-icon="send"]',
                '[aria-label*="Send"]',
                'button[type="submit"]'
            ];
            
            let sendButton = null;
            for (const selector of sendSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    // If it's a span, get the parent button
                    sendButton = element.tagName.toLowerCase() === 'span' ? 
                                element.closest('button') : element;
                    if (sendButton) {
                        console.log('Found send button with selector:', selector);
                        break;
                    }
                }
            }
            
            if (sendButton) {
                sendButton.click();
                console.log('Message sent successfully');
            } else {
                // Fallback: try pressing Enter key
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                messageInput.dispatchEvent(enterEvent);
                console.log('Attempted to send with Enter key');
            }
        }, 100);
        
        return { success: true };
        
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// Function to translate a message using Chrome's Language Detection and Translation APIs
async function translateMessage(baseLanguage) {
    try {
        console.log('Starting translation process for base language:', baseLanguage);
        
        // Internal function to get last non-user message (defined inside for content script context)
        function getLastNonUserMessageInternal() {
            try {
                console.log('Getting last non-user message from active chat');
                
                // Use proven selectors from summarization feature
                const messageSelectors = {
                    primary: '.copyable-text[data-pre-plain-text]',
                    fallbacks: ['.copyable-text', '[data-pre-plain-text]']
                };
                
                // Find message container
                const chatContainer = document.querySelector('#main .copyable-area') || 
                                     document.querySelector('[role="main"] .copyable-area');
                
                if (!chatContainer) {
                    return {
                        success: false,
                        error: 'No active chat found. Please open a WhatsApp chat first.'
                    };
                }
                
                // Try to find messages using proven selectors
                let messageElements = chatContainer.querySelectorAll(messageSelectors.primary);
                if (messageElements.length === 0) {
                    for (const fallback of messageSelectors.fallbacks) {
                        messageElements = chatContainer.querySelectorAll(fallback);
                        if (messageElements.length > 0) {
                            console.log(`Found messages using fallback selector: ${fallback}`);
                            break;
                        }
                    }
                }
                
                if (messageElements.length === 0) {
                    return {
                        success: false,
                        error: 'No messages found in the active chat.'
                    };
                }
                
                // Get the last few messages and find the last non-user message
                const lastMessages = Array.from(messageElements).slice(-10); // Look at last 10 messages
                
                // Iterate backwards to find the last non-user message
                for (let i = lastMessages.length - 1; i >= 0; i--) {
                    const messageElement = lastMessages[i];
                    const prePlainText = messageElement.getAttribute('data-pre-plain-text');
                    
                    // Check if this is a message from another user (not sent by current user)
                    let senderName = 'Unknown';
                    let isFromOtherUser = false;
                    
                    if (prePlainText) {
                        const senderMatch = prePlainText.match(/\] (.+?):/); 
                        if (senderMatch) {
                            senderName = senderMatch[1];
                            isFromOtherUser = true; // Has sender info means it's from another user
                        }
                    }
                    
                    // Additional check: user's own messages are typically on the right side
                    const messageParent = messageElement.closest('.message-in, .message-out');
                    if (messageParent && messageParent.classList.contains('message-in')) {
                        isFromOtherUser = true;
                    }
                    
                    if (isFromOtherUser) {
                        const messageText = messageElement.textContent?.trim() || '';
                        if (messageText) {
                            return {
                                success: true,
                                text: messageText,
                                sender: senderName
                            };
                        }
                    }
                }
                
                return {
                    success: false,
                    error: 'No messages from other users found in recent messages.'
                };
                
            } catch (error) {
                console.error('Error getting last message:', error);
                return {
                    success: false,
                    error: 'Failed to get last message: ' + error.message
                };
            }
        }
        
        // Get the last non-user message
        const lastMessageResult = getLastNonUserMessageInternal();
        if (!lastMessageResult.success) {
            return lastMessageResult;
        }
        
        const { sender, text } = lastMessageResult;
        console.log('Got last message from:', sender, 'Text:', text);
        
        // Check if Language Detection API is available
        if (!('LanguageDetector' in window)) {
            return {
                success: false,
                error: 'Language Detection API not available. Please enable Chrome AI flags.'
            };
        }
        
        // Create language detector
        const languageDetector = await window.LanguageDetector.create({
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    console.log(`Language detector download: ${Math.round(e.loaded * 100)}%`);
                });
            }
        });
        
        // Detect language
        const detectionResults = await languageDetector.detect(text);
        languageDetector.destroy();
        
        if (!detectionResults || detectionResults.length === 0) {
            return {
                success: false,
                error: 'Could not detect language of the message'
            };
        }
        
        const detectedLanguage = detectionResults[0].detectedLanguage;
        const confidence = detectionResults[0].confidence;
        
        console.log('Detected language:', detectedLanguage, 'Confidence:', confidence);
        
        // Check if translation is needed
        const needsTranslation = detectedLanguage !== baseLanguage && confidence > 0.5;
        
        let translatedText = null;
        
        if (needsTranslation) {
            // Check if Translator API is available
            if (!('Translator' in window)) {
                return {
                    success: false,
                    error: 'Translator API not available. Please enable Chrome AI flags.'
                };
            }
            
            try {
                // Create translator
                const translator = await window.Translator.create({
                    sourceLanguage: detectedLanguage,
                    targetLanguage: baseLanguage,
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            console.log(`Translator download: ${Math.round(e.loaded * 100)}%`);
                        });
                    }
                });
                
                // Translate the text
                translatedText = await translator.translate(text);
                translator.destroy();
                
                console.log('Translation successful:', translatedText);
                
            } catch (translationError) {
                console.warn('Translation failed:', translationError);
                return {
                    success: false,
                    error: 'Translation failed: ' + translationError.message
                };
            }
        }
        
        return {
            success: true,
            sender: sender,
            text: text,
            detectedLanguage: detectedLanguage,
            translatedText: translatedText,
            needsTranslation: needsTranslation,
            confidence: confidence
        };
        
    } catch (error) {
        console.error('Error in translateMessage:', error);
        return {
            success: false,
            error: 'Failed to translate message: ' + error.message
        };
    }
}


// Function to translate and send a message
async function translateAndSendMessage(text, sourceLanguage, targetLanguage) {
    try {
        console.log('Translating and sending message:', { text, sourceLanguage, targetLanguage });
        
        // Enhanced function to send a message in WhatsApp using proven execCommand approach
        function sendWhatsAppMessage(messageText) {
            try {
                console.log('Attempting to send message:', messageText);
                
                // Find message input using multiple selectors (research-proven approach)
                const inputSelectors = [
                    '[data-testid="conversation-compose-box-input"]',
                    '#main div[contenteditable="true"]',
                    '[contenteditable="true"][role="textbox"]',
                    '#main .copyable-area [contenteditable="true"]',
                    '[contenteditable="true"][data-tab]',
                    '#main footer [contenteditable="true"]',
                    '[data-lexical-text="true"]'
                ];
                
                let messageInput = null;
                for (const selector of inputSelectors) {
                    messageInput = document.querySelector(selector);
                    if (messageInput) {
                        console.log('Found message input with selector:', selector);
                        break;
                    }
                }
                
                if (!messageInput) {
                    throw new Error('Message input not found');
                }
                
                // Clear existing content, focus, and insert text using proven approach
                messageInput.focus();
                
                // Use execCommand for reliable text insertion (research shows this works best)
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, messageText);
                
                // Trigger events to make WhatsApp recognize the text
                const inputEvent = new Event('input', { bubbles: true });
                messageInput.dispatchEvent(inputEvent);
                
                const changeEvent = new Event('change', { bubbles: true });
                messageInput.dispatchEvent(changeEvent);
                
                // Wait a moment for WhatsApp to process the input
                setTimeout(() => {
                    // Find and click send button using multiple selectors
                    const sendSelectors = [
                        '[data-testid="send"]',
                        '[data-icon="send"]',
                        'span[data-icon="send"]',
                        'button span[data-icon="send"]',
                        '[aria-label*="Send"]',
                        'button[type="submit"]'
                    ];
                    
                    let sendButton = null;
                    for (const selector of sendSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            // If it's a span, get the parent button
                            sendButton = element.tagName.toLowerCase() === 'span' ? 
                                        element.closest('button') : element;
                            if (sendButton) {
                                console.log('Found send button with selector:', selector);
                                break;
                            }
                        }
                    }
                    
                    if (sendButton) {
                        sendButton.click();
                        console.log('Message sent successfully');
                    } else {
                        // Fallback: try pressing Enter key
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        });
                        messageInput.dispatchEvent(enterEvent);
                        console.log('Attempted to send with Enter key');
                    }
                }, 100);
                
                return { success: true };
                
            } catch (error) {
                console.error('Error sending message:', error);
                return { success: false, error: error.message };
            }
        }
        
        let messageToSend = text;
        
        // Only translate if source and target languages are different
        if (sourceLanguage !== targetLanguage) {
            // Check if Translator API is available
            if (!('Translator' in window)) {
                return {
                    success: false,
                    error: 'Translator API not available. Please enable Chrome AI flags.'
                };
            }
            
            try {
                // Create translator
                const translator = await window.Translator.create({
                    sourceLanguage: sourceLanguage,
                    targetLanguage: targetLanguage,
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            console.log(`Reply translator download: ${Math.round(e.loaded * 100)}%`);
                        });
                    }
                });
                
                // Translate the text
                messageToSend = await translator.translate(text);
                translator.destroy();
                
                console.log('Reply translated:', messageToSend);
                
            } catch (translationError) {
                console.warn('Reply translation failed:', translationError);
                // Fallback to original text if translation fails
                messageToSend = text;
            }
        }
        
        // Send the message using the sendWhatsAppMessage function (now defined in same scope)
        return sendWhatsAppMessage(messageToSend);
        
    } catch (error) {
        console.error('Error in translateAndSendMessage:', error);
        return {
            success: false,
            error: 'Failed to translate and send message: ' + error.message
        };
    }
}

// Initialize the background service worker
const backgroundService = new WhatsAppAssistantBackground();