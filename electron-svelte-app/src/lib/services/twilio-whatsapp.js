/**
 * Twilio WhatsApp Service
 * High-level service for sending WhatsApp messages via Twilio
 * 
 * This module provides a clean interface for WhatsApp messaging functionality
 * It handles message formatting, validation, and error handling
 */

import {
  sendWhatsAppMessage as sendWhatsAppMessageIPC,
  fetchMessage as fetchMessageIPC,
  listMessages as listMessagesIPC,
  getTwilioConfig as getTwilioConfigIPC,
  updateTwilioConfig as updateTwilioConfigIPC,
  formatPhoneNumber,
  formatWhatsAppNumber,
  isValidE164,
  isValidWhatsAppNumber
} from './twilio-ipc.js';

/**
 * Twilio WhatsApp Service Class
 * Provides methods for sending and managing WhatsApp messages
 */
class TwilioWhatsAppService {
  constructor() {
    this.initialized = false;
    this.config = null;
  }

  /**
   * Initialize the service and load configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      this.config = await getTwilioConfigIPC();
      this.initialized = true;
      console.log('[Twilio WhatsApp Service] Initialized successfully');
    } catch (error) {
      console.error('[Twilio WhatsApp Service] Failed to initialize:', error);
      throw new Error(`Failed to initialize Twilio WhatsApp service: ${error.message}`);
    }
  }

  /**
   * Ensure service is initialized before operations
   * @private
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Send a WhatsApp message
   * 
   * @param {Object} messageData - Message data
   * @param {string} messageData.to - Recipient phone number (will be formatted to E.164)
   * @param {string} messageData.from - Sender phone number (optional, uses default if not provided)
   * @param {string} messageData.body - Message body text (required)
   * @param {Array<string>} messageData.mediaUrl - Array of media URLs (optional)
   * @param {string} messageData.statusCallback - Status callback URL (optional)
   * @returns {Promise<Object>} Message response
   * @throws {Error} If validation fails or sending fails
   */
  async sendMessage(messageData) {
    await this.ensureInitialized();

    // Validate required fields
    if (!messageData.to || !messageData.to.trim()) {
      throw new Error('Recipient phone number is required');
    }

    if (!messageData.body || !messageData.body.trim()) {
      throw new Error('Message body is required');
    }

    // Format phone numbers
    const toNumber = formatPhoneNumber(messageData.to);
    
    // Validate recipient number
    if (!isValidE164(toNumber)) {
      throw new Error(`Invalid recipient phone number format. Expected E.164 format (e.g., +1234567890), got: ${messageData.to}`);
    }

    // Use provided sender or default from config
    let fromNumber;
    if (messageData.from && messageData.from.trim()) {
      fromNumber = formatPhoneNumber(messageData.from);
      if (!isValidE164(fromNumber)) {
        throw new Error(`Invalid sender phone number format. Expected E.164 format (e.g., +1234567890), got: ${messageData.from}`);
      }
    } else if (this.config.whatsappFrom) {
      fromNumber = this.config.whatsappFrom;
    } else {
      throw new Error('Sender phone number is required. Either provide it in messageData.from or configure a default sender.');
    }

    // Prepare message data
    const formattedMessageData = {
      to: toNumber,
      from: fromNumber,
      body: messageData.body.trim()
    };

    // Add optional media URLs
    if (messageData.mediaUrl && Array.isArray(messageData.mediaUrl) && messageData.mediaUrl.length > 0) {
      formattedMessageData.mediaUrl = messageData.mediaUrl;
    }

    // Add optional status callback
    if (messageData.statusCallback && messageData.statusCallback.trim()) {
      formattedMessageData.statusCallback = messageData.statusCallback.trim();
    }

    try {
      console.log('[Twilio WhatsApp Service] Sending message to:', toNumber);
      const result = await sendWhatsAppMessageIPC(formattedMessageData);
      console.log('[Twilio WhatsApp Service] Message sent successfully');
      return result;
    } catch (error) {
      console.error('[Twilio WhatsApp Service] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send a WhatsApp message with media
   * 
   * @param {string} to - Recipient phone number
   * @param {string} body - Message body text
   * @param {Array<string>} mediaUrls - Array of media URLs
   * @param {string} from - Sender phone number (optional)
   * @returns {Promise<Object>} Message response
   */
  async sendMessageWithMedia(to, body, mediaUrls, from = null) {
    return this.sendMessage({
      to,
      from,
      body,
      mediaUrl: mediaUrls
    });
  }

  /**
   * Send a simple text WhatsApp message
   * 
   * @param {string} to - Recipient phone number
   * @param {string} body - Message body text
   * @param {string} from - Sender phone number (optional)
   * @returns {Promise<Object>} Message response
   */
  async sendTextMessage(to, body, from = null) {
    return this.sendMessage({
      to,
      from,
      body
    });
  }

  /**
   * Fetch a specific message by SID
   * 
   * @param {string} messageSid - The Twilio message SID
   * @returns {Promise<Object>} Message details
   */
  async fetchMessage(messageSid) {
    await this.ensureInitialized();

    if (!messageSid || !messageSid.trim()) {
      throw new Error('Message SID is required');
    }

    try {
      console.log('[Twilio WhatsApp Service] Fetching message:', messageSid);
      const result = await fetchMessageIPC(messageSid);
      return result;
    } catch (error) {
      console.error('[Twilio WhatsApp Service] Failed to fetch message:', error);
      throw error;
    }
  }

  /**
   * List messages with optional filters
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.to - Filter by recipient number (optional)
   * @param {string} filters.from - Filter by sender number (optional)
   * @param {Date} filters.dateSent - Filter by sent date (optional)
   * @param {number} filters.limit - Maximum number of messages (default: 20, max: 1000)
   * @returns {Promise<Array>} List of messages
   */
  async listMessages(filters = {}) {
    await this.ensureInitialized();

    try {
      console.log('[Twilio WhatsApp Service] Listing messages');
      const result = await listMessagesIPC(filters);
      return result;
    } catch (error) {
      console.error('[Twilio WhatsApp Service] Failed to list messages:', error);
      throw error;
    }
  }

  /**
   * Get current Twilio configuration
   * 
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig() {
    await this.ensureInitialized();
    return this.config;
  }

  /**
   * Update Twilio configuration
   * 
   * @param {Object} config - Configuration updates
   * @param {string} config.accountSid - Twilio Account SID (optional)
   * @param {string} config.authToken - Twilio Auth Token (optional)
   * @param {string} config.whatsappFrom - WhatsApp sender number (optional)
   * @returns {Promise<void>}
   */
  async updateConfig(config) {
    try {
      console.log('[Twilio WhatsApp Service] Updating configuration');
      await updateTwilioConfigIPC(config);
      
      // Reload configuration
      this.config = await getTwilioConfigIPC();
      console.log('[Twilio WhatsApp Service] Configuration updated successfully');
    } catch (error) {
      console.error('[Twilio WhatsApp Service] Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Set default WhatsApp sender number
   * 
   * @param {string} phoneNumber - Phone number in E.164 format
   * @returns {Promise<void>}
   */
  async setDefaultSender(phoneNumber) {
    const formatted = formatPhoneNumber(phoneNumber);
    
    if (!isValidE164(formatted)) {
      throw new Error(`Invalid phone number format. Expected E.164 format (e.g., +1234567890), got: ${phoneNumber}`);
    }

    await this.updateConfig({ whatsappFrom: formatted });
  }

  /**
   * Validate phone number format
   * 
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid
   */
  validatePhoneNumber(phoneNumber) {
    const formatted = formatPhoneNumber(phoneNumber);
    return isValidE164(formatted);
  }

  /**
   * Format phone number to E.164 format
   * 
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    return formatPhoneNumber(phoneNumber);
  }

  /**
   * Format phone number to WhatsApp format
   * 
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted WhatsApp number
   */
  formatWhatsAppNumber(phoneNumber) {
    return formatWhatsAppNumber(phoneNumber);
  }
}

// Create singleton instance
const twilioWhatsAppService = new TwilioWhatsAppService();

// Export the service instance and utility functions
export { 
  twilioWhatsAppService, 
  formatPhoneNumber, 
  formatWhatsAppNumber, 
  isValidE164, 
  isValidWhatsAppNumber 
};

export default twilioWhatsAppService;

