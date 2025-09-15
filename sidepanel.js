// WACAO! - Side Panel Logic
// Handles UI interactions for both summarization and translation features

class SidePanelUI {
    constructor() {
        // Tab elements
        this.tabElements = {
            summaryTab: document.getElementById('summaryTab'),
            translatorTab: document.getElementById('translatorTab'),
            summaryContent: document.getElementById('summaryContent'),
            translatorContent: document.getElementById('translatorContent')
        };
        
        // Summary elements
        this.summaryElements = {
            summarizeBtn: document.getElementById('summarizeBtn'),
            messageCount: document.getElementById('messageCount'),
            status: document.getElementById('summaryStatus'),
            results: document.getElementById('summaryResults'),
            error: document.getElementById('summaryError'),
            summaryContent: document.getElementById('summaryText')
        };
        
        // Translation manager
        this.translationManager = new TranslationManager();
        
        this.init();
    }
    
    init() {
        this.setupTabSwitching();
        this.setupEventListeners();
        this.setupMessageListener();
        this.showInitialState();
    }
    
    setupTabSwitching() {
        this.tabElements.summaryTab.addEventListener('click', () => this.switchTab('summary'));
        this.tabElements.translatorTab.addEventListener('click', () => this.switchTab('translator'));
    }
    
    switchTab(tabName) {
        // Remove active classes from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab
        if (tabName === 'summary') {
            this.tabElements.summaryTab.classList.add('active');
            this.tabElements.summaryContent.classList.add('active');
        } else if (tabName === 'translator') {
            this.tabElements.translatorTab.classList.add('active');
            this.tabElements.translatorContent.classList.add('active');
            // Initialize translation UI when first opened
            this.translationManager.initializeUI();
        }
    }
    
    setupEventListeners() {
        this.summaryElements.summarizeBtn.addEventListener('click', () => {
            this.handleSummarizeClick();
        });
        
        // Reset UI when user changes message count
        this.summaryElements.messageCount.addEventListener('change', () => {
            this.hideSummaryMessages();
        });
    }
    
    setupMessageListener() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Side panel received message:', message);
            
            switch (message.type) {
                case 'summaryResult':
                    this.showSummary(message.data);
                    break;
                    
                case 'summaryError':
                    this.showSummaryError(message.error);
                    break;
                    
                case 'scrapingComplete':
                    this.updateSummaryStatus('🤖 Generating summary with AI...');
                    break;
                    
                // Translation-related messages
                case 'translationResult':
                    this.translationManager.showTranslationResult(message.data);
                    break;
                    
                case 'translationError':
                    this.translationManager.showError(message.error);
                    break;
                    
                case 'perform_translation_with_activation':
                    this.translationManager.handleTranslationWithActivation(message, sender, sendResponse);
                    return true; // Keep message channel open for async response
                    
                default:
                    console.warn('Unknown message type:', message.type);
            }
            
            sendResponse({ received: true });
        });
    }
    
    async handleSummarizeClick() {
        try {
            // Get selected message count
            const messageCount = parseInt(this.summaryElements.messageCount.value);
            console.log('Starting summarization for', messageCount, 'messages');
            
            // Update UI to loading state
            this.showSummaryLoadingState();
            
            // First, create the summarizer here (where user activation is available)
            console.log('Side panel: Creating summarizer with user activation...');
            
            // Check if Summarizer API exists
            if (!('Summarizer' in window)) {
                throw new Error('Summarizer API not available in this browser');
            }
            
            // Check availability
            const availability = await window.Summarizer.availability();
            console.log('Side panel: Summarizer availability:', availability);
            
            if (availability === 'no') {
                throw new Error('Summarizer is not available on this device');
            }
            
            // Check user activation
            const hasUserActivation = navigator.userActivation?.isActive || false;
            console.log('Side panel: User activation active:', hasUserActivation);
            
            let summarizer;
            
            switch (availability) {
                case 'unavailable':
                    throw new Error('AI Summarizer is not supported on this device. Your device may have insufficient power or disk space.');
                
                case 'downloadable':
                    this.updateSummaryStatus('📥 Downloading AI model (this may take a few minutes)...');
                    console.log('Side panel: Starting model download...');
                    
                    const self = this;
                    summarizer = await window.Summarizer.create({
                        type: 'key-points',
                        format: 'markdown',
                        length: 'medium',
                        monitor(m) {
                            m.addEventListener('downloadprogress', (e) => {
                                const progress = Math.round(e.loaded * 100);
                                console.log(`Model download progress: ${progress}%`);
                                self.updateSummaryStatus(`📥 Downloading AI model: ${progress}%`);
                            });
                        }
                    });
                    break;
                
                case 'downloading':
                    throw new Error('AI model is currently downloading. Please wait a moment and try again.');
                
                case 'available':
                    console.log('Side panel: Using available model');
                    summarizer = await window.Summarizer.create({
                        type: 'key-points',
                        format: 'markdown',
                        length: 'medium'
                    });
                    break;
                
                default:
                    throw new Error(`Unknown AI model status: ${availability}`);
            }
            
            // Now scrape messages and summarize
            this.updateSummaryStatus('📱 Reading messages from WhatsApp...');
            
            // Send message to background script to scrape messages
            const response = await chrome.runtime.sendMessage({
                type: 'scrape_messages_only',
                messageCount: messageCount
            });
            
            if (!response.success) {
                throw new Error(response.error);
            }
            
            // Generate summary
            this.updateSummaryStatus('🤖 Generating summary with AI...');
            console.log('Side panel: Generating summary for text length:', response.messages.length);
            
            const summary = await summarizer.summarize(response.messages);
            console.log('Side panel: Summary generated successfully');
            
            // Clean up
            summarizer.destroy();
            
            // Show result
            this.showSummary(summary);
            
        } catch (error) {
            console.error('Error starting summarization:', error);
            this.showSummaryError('Failed to start summarization: ' + error.message);
        }
    }
    
    showInitialState() {
        this.summaryElements.summarizeBtn.disabled = false;
        this.hideSummaryMessages();
    }
    
    showSummaryLoadingState() {
        this.summaryElements.summarizeBtn.disabled = true;
        this.summaryElements.summarizeBtn.classList.add('loading');
        this.updateSummaryStatus('📱 Reading messages from WhatsApp...');
        this.hideSummaryResults();
        this.hideSummaryError();
    }
    
    hideSummaryLoadingState() {
        this.summaryElements.summarizeBtn.disabled = false;
        this.summaryElements.summarizeBtn.classList.remove('loading');
        this.hideSummaryStatus();
    }
    
    updateSummaryStatus(message) {
        this.summaryElements.status.textContent = message;
        this.summaryElements.status.classList.remove('hidden');
    }
    
    hideSummaryStatus() {
        this.summaryElements.status.classList.add('hidden');
    }
    
    showSummary(summary) {
        this.hideSummaryLoadingState();
        this.summaryElements.summaryContent.textContent = summary;
        this.summaryElements.results.classList.remove('hidden');
        console.log('Summary displayed successfully');
    }
    
    hideSummaryResults() {
        this.summaryElements.results.classList.add('hidden');
    }
    
    showSummaryError(errorMessage) {
        this.hideSummaryLoadingState();
        this.summaryElements.error.textContent = '❌ ' + errorMessage;
        this.summaryElements.error.classList.remove('hidden');
        console.error('Error displayed:', errorMessage);
    }
    
    hideSummaryError() {
        this.summaryElements.error.classList.add('hidden');
    }
    
    hideSummaryMessages() {
        this.hideSummaryStatus();
        this.hideSummaryResults();
        this.hideSummaryError();
    }
}

// TranslationManager class - handles all translation functionality
class TranslationManager {
    constructor() {
        this.elements = {
            baseLanguage: document.getElementById('baseLanguage'),
            translateLastMessage: document.getElementById('translateLastMessage'),
            status: document.getElementById('translatorStatus'),
            translationResult: document.getElementById('translationResult'),
            originalSender: document.getElementById('originalSender'),
            detectedLanguage: document.getElementById('detectedLanguage'),
            originalMessage: document.getElementById('originalMessage'),
            translatedMessage: document.getElementById('translatedMessage'),
            replySection: document.getElementById('replySection'),
            replyInput: document.getElementById('replyInput'),
            sendReply: document.getElementById('sendReply'),
            error: document.getElementById('translatorError')
        };
        
        this.state = {
            baseLanguage: 'en',
            languageDetector: null,
            translator: null,
            lastTranslatedMessage: null
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.elements.baseLanguage.addEventListener('change', () => {
            this.state.baseLanguage = this.elements.baseLanguage.value;
            this.savePreferences();
            this.updateReplyPlaceholder();
        });
        
        this.elements.translateLastMessage.addEventListener('click', () => {
            this.translateLastMessage();
        });
        
        this.elements.sendReply.addEventListener('click', () => {
            this.sendTranslatedReply();
        });
        
        this.elements.replyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.sendTranslatedReply();
            }
        });
    }
    
    async initializeUI() {
        console.log('Initializing translation UI');
        
        // Load saved preferences
        await this.loadPreferences();
        
        // Initialize AI APIs
        await this.initializeAPIs();
    }
    
    async loadPreferences() {
        try {
            const result = await chrome.storage.local.get(['baseLanguage']);
            if (result.baseLanguage) {
                this.state.baseLanguage = result.baseLanguage;
                this.elements.baseLanguage.value = result.baseLanguage;
            }
            this.updateReplyPlaceholder();
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }
    
    async savePreferences() {
        try {
            await chrome.storage.local.set({
                baseLanguage: this.state.baseLanguage
            });
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }
    
    updateReplyPlaceholder() {
        const languageNames = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi'
        };
        
        const langName = languageNames[this.state.baseLanguage] || 'your language';
        this.elements.replyInput.placeholder = `Type your reply in ${langName}...`;
    }
    
    async translateLastMessage() {
        try {
            console.log('Starting translation of last message');
            
            // Show loading state
            this.elements.translateLastMessage.disabled = true;
            this.elements.translateLastMessage.classList.add('loading');
            this.updateStatus('📱 Reading last message from WhatsApp...');
            this.hideTranslationResult();
            this.hideError();
            
            // Update status for AI processing
            setTimeout(() => {
                if (this.elements.translateLastMessage.disabled) {
                    this.updateStatus('🔍 Detecting language with AI...');
                }
            }, 1000);
            
            setTimeout(() => {
                if (this.elements.translateLastMessage.disabled) {
                    this.updateStatus('🌐 Translating message...');
                }
            }, 2000);
            
            // Get the last non-user message from WhatsApp
            const response = await chrome.runtime.sendMessage({
                type: 'translate_last_message',
                baseLanguage: this.state.baseLanguage
            });
            
            if (!response.success) {
                throw new Error(response.error);
            }
            
            const { sender, text, detectedLanguage, translatedText, needsTranslation } = response.data;
            
            // Store the last translated message for reply context
            this.state.lastTranslatedMessage = {
                sender,
                text,
                detectedLanguage,
                translatedText: needsTranslation ? translatedText : null
            };
            
            // Show translation result
            this.showTranslationResult({
                sender,
                originalText: text,
                translatedText: needsTranslation ? translatedText : null,
                detectedLanguage,
                needsTranslation
            });
            
            // Show reply section if translation was needed
            if (needsTranslation) {
                this.elements.replySection.classList.remove('hidden');
            }
            
            this.hideStatus();
            
        } catch (error) {
            console.error('Failed to translate last message:', error);
            this.showError('Failed to translate message: ' + error.message);
        } finally {
            this.elements.translateLastMessage.disabled = false;
            this.elements.translateLastMessage.classList.remove('loading');
        }
    }
    
    async initializeAPIs() {
        try {
            console.log('Initializing Language Detection and Translation APIs');
            
            // Check Language Detector availability
            if (!('LanguageDetector' in window)) {
                throw new Error('Language Detection API not available');
            }
            
            // Check Translator availability  
            if (!('Translator' in window)) {
                throw new Error('Translator API not available');
            }
            
            // Create language detector
            this.state.languageDetector = await window.LanguageDetector.create({
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`Language detector download: ${Math.round(e.loaded * 100)}%`);
                    });
                }
            });
            
            console.log('Translation APIs initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize APIs:', error);
            this.showError('Failed to initialize AI APIs: ' + error.message);
        }
    }
    
    showTranslationResult(messageData) {
        const { sender, originalText, translatedText, detectedLanguage, needsTranslation } = messageData;
        
        // Update the translation result display
        this.elements.originalSender.textContent = sender;
        this.elements.originalMessage.textContent = originalText;
        
        // Language indicator
        const languageNames = {
            'en': 'EN', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'it': 'IT',
            'pt': 'PT', 'ru': 'RU', 'ja': 'JA', 'ko': 'KO', 'zh': 'ZH',
            'ar': 'AR', 'hi': 'HI'
        };
        
        this.elements.detectedLanguage.textContent = languageNames[detectedLanguage] || detectedLanguage.toUpperCase();
        
        // Show/hide translated text
        if (needsTranslation && translatedText) {
            this.elements.translatedMessage.textContent = `📝 ${translatedText}`;
            this.elements.translatedMessage.style.display = 'block';
        } else {
            this.elements.translatedMessage.textContent = '✅ Already in your language';
            this.elements.translatedMessage.style.display = 'block';
        }
        
        // Show the translation result container
        this.elements.translationResult.classList.remove('hidden');
    }
    
    hideTranslationResult() {
        this.elements.translationResult.classList.add('hidden');
        this.elements.replySection.classList.add('hidden');
    }
    
    async sendTranslatedReply() {
        const replyText = this.elements.replyInput.value.trim();
        if (!replyText) {
            this.showError('Please type a reply message first');
            return;
        }
        
        try {
            this.elements.sendReply.disabled = true;
            
            // Determine target language from last translated message
            let targetLanguage = 'en'; // default
            if (this.state.lastTranslatedMessage && this.state.lastTranslatedMessage.detectedLanguage) {
                targetLanguage = this.state.lastTranslatedMessage.detectedLanguage;
            }
            
            // Show different status based on whether translation is needed
            if (targetLanguage !== this.state.baseLanguage) {
                this.updateStatus('🌐 Translating your reply...');
                setTimeout(() => {
                    if (this.elements.sendReply.disabled) {
                        this.updateStatus('📤 Sending translated message...');
                    }
                }, 1500);
            } else {
                this.updateStatus('📤 Sending your reply...');
            }
            
            // Send the reply (background script will handle translation if needed)
            const response = await chrome.runtime.sendMessage({
                type: 'send_translated_message',
                text: replyText,
                sourceLanguage: this.state.baseLanguage,
                targetLanguage: targetLanguage
            });
            
            if (response.success) {
                // Clear reply input and show success
                this.elements.replyInput.value = '';
                this.updateStatus('✅ Reply sent successfully!');
                setTimeout(() => {
                    this.hideStatus();
                }, 2000);
                console.log('Reply sent successfully');
            } else {
                throw new Error(response.error);
            }
            
        } catch (error) {
            console.error('Failed to send reply:', error);
            this.showError('Failed to send reply: ' + error.message);
        } finally {
            this.elements.sendReply.disabled = false;
        }
    }
    
    hideError() {
        this.elements.error.classList.add('hidden');
    }
    
    // Handle translation with user activation preserved
    async handleTranslationWithActivation(message, sender, sendResponse) {
        try {
            const { text, sender: messageSender, baseLanguage } = message;
            console.log('Handling translation with user activation:', { text, messageSender, baseLanguage });
            
            // Check if Language Detection API is available
            if (!('LanguageDetector' in window)) {
                sendResponse({
                    success: false,
                    error: 'Language Detection API not available. Please enable Chrome AI flags.'
                });
                return;
            }
            
            // Create language detector with user activation
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
                sendResponse({
                    success: false,
                    error: 'Could not detect language of the message'
                });
                return;
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
                    sendResponse({
                        success: false,
                        error: 'Translator API not available. Please enable Chrome AI flags.'
                    });
                    return;
                }
                
                try {
                    // Create translator with user activation
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
                    sendResponse({
                        success: false,
                        error: 'Translation failed: ' + translationError.message
                    });
                    return;
                }
            }
            
            // Send successful result
            sendResponse({
                success: true,
                data: {
                    sender: messageSender,
                    text: text,
                    detectedLanguage: detectedLanguage,
                    translatedText: translatedText,
                    needsTranslation: needsTranslation,
                    confidence: confidence
                }
            });
            
        } catch (error) {
            console.error('Error in handleTranslationWithActivation:', error);
            sendResponse({
                success: false,
                error: 'Failed to translate message: ' + error.message
            });
        }
    }
    
    updateStatus(message) {
        this.elements.status.textContent = message;
        this.elements.status.classList.remove('hidden');
    }
    
    hideStatus() {
        this.elements.status.classList.add('hidden');
    }
    
    showError(errorMessage) {
        this.elements.error.textContent = '❌ ' + errorMessage;
        this.elements.error.classList.remove('hidden');
        this.hideStatus();
        console.error('Translation error:', errorMessage);
        
        // Hide error after 5 seconds
        setTimeout(() => {
            this.elements.error.classList.add('hidden');
        }, 5000);
    }
}

// Initialize the side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Side panel loaded');
    new SidePanelUI();
});

// Handle any initialization errors
window.addEventListener('error', (event) => {
    console.error('Side panel error:', event.error);
});