/**
 * Twilio WhatsApp IPC Service
 * Provides communication bridge between renderer process and main process for Twilio API calls
 * 
 * This module handles all IPC communication for Twilio WhatsApp messaging
 * All API calls are executed in the main process to avoid CORS restrictions
 */

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

/**
 * Check if IPC is available (running in Electron)
 * @returns {boolean} True if IPC is available
 */
function isIPCAvailable() {
  return ipcRenderer !== null;
}

/**
 * Send a WhatsApp template message via Twilio API
 *
 * @param {Object} messageData - Message data
 * @param {string} messageData.to - Recipient WhatsApp number (E.164 format: +1234567890)
 * @param {string} messageData.from - Sender WhatsApp number (E.164 format: +1234567890)
 * @param {string} messageData.contentSid - Template Content SID (required for templates)
 * @param {Object} [messageData.contentVariables] - Template variables (optional)
 * @param {string} [messageData.statusCallback] - Callback URL for status updates (optional)
 * @returns {Promise<Object>} Message response from Twilio API
 * @throws {Error} If IPC is not available or message sending fails
 */
export async function sendWhatsAppMessage(messageData) {
  if (!isIPCAvailable()) {
    throw new Error('IPC not available. This function must be called from Electron renderer process.');
  }

  try {
    console.log('[Twilio IPC] Sending WhatsApp template message request to main process');
    const result = await ipcRenderer.invoke('twilio:sendWhatsAppMessage', messageData);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send WhatsApp message');
    }

    console.log('[Twilio IPC] WhatsApp template message sent successfully');
    return result.data;
  } catch (error) {
    console.error('[Twilio IPC] Failed to send WhatsApp message:', error);
    throw error;
  }
}

/**
 * Fetch a specific message by SID
 * 
 * @param {string} messageSid - The Twilio message SID
 * @returns {Promise<Object>} Message details
 * @throws {Error} If IPC is not available or message fetch fails
 */
export async function fetchMessage(messageSid) {
  if (!isIPCAvailable()) {
    throw new Error('IPC not available. This function must be called from Electron renderer process.');
  }

  try {
    console.log('[Twilio IPC] Fetching message:', messageSid);
    const result = await ipcRenderer.invoke('twilio:fetchMessage', messageSid);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch message');
    }
    
    console.log('[Twilio IPC] Message fetched successfully');
    return result.data;
  } catch (error) {
    console.error('[Twilio IPC] Failed to fetch message:', error);
    throw error;
  }
}

/**
 * List messages with optional filters
 *
 * @param {Object} [filters={}] - Filter options
 * @param {string} [filters.to] - Filter by recipient number (optional)
 * @param {string} [filters.from] - Filter by sender number (optional)
 * @param {Date} [filters.dateSent] - Filter by sent date (optional)
 * @param {number} [filters.limit] - Maximum number of messages to return (default: 20, max: 1000)
 * @returns {Promise<Array>} List of messages
 * @throws {Error} If IPC is not available or listing fails
 */
export async function listMessages(filters = {}) {
  if (!isIPCAvailable()) {
    throw new Error('IPC not available. This function must be called from Electron renderer process.');
  }

  try {
    console.log('[Twilio IPC] Listing messages with filters');
    const result = await ipcRenderer.invoke('twilio:listMessages', filters);

    if (!result.success) {
      throw new Error(result.error || 'Failed to list messages');
    }
    
    console.log('[Twilio IPC] Messages listed successfully');
    return result.data;
  } catch (error) {
    console.error('[Twilio IPC] Failed to list messages:', error);
    throw error;
  }
}

/**
 * Get Twilio configuration
 * Returns configuration without sensitive data
 * 
 * @returns {Promise<Object>} Twilio configuration
 * @throws {Error} If IPC is not available or config fetch fails
 */
export async function getTwilioConfig() {
  if (!isIPCAvailable()) {
    throw new Error('IPC not available. This function must be called from Electron renderer process.');
  }

  try {
    console.log('[Twilio IPC] Getting Twilio configuration');
    const result = await ipcRenderer.invoke('twilio:getConfig');
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get Twilio configuration');
    }
    
    console.log('[Twilio IPC] Configuration retrieved successfully');
    return result.data;
  } catch (error) {
    console.error('[Twilio IPC] Failed to get configuration:', error);
    throw error;
  }
}

/**
 * Update Twilio configuration
 * Allows updating credentials and WhatsApp sender number
 * 
 * @param {Object} config - Configuration updates
 * @param {string} config.accountSid - Twilio Account SID (optional)
 * @param {string} config.authToken - Twilio Auth Token (optional)
 * @param {string} config.whatsappFrom - WhatsApp sender number (optional)
 * @returns {Promise<void>}
 * @throws {Error} If IPC is not available or config update fails
 */
export async function updateTwilioConfig(config) {
  if (!isIPCAvailable()) {
    throw new Error('IPC not available. This function must be called from Electron renderer process.');
  }

  try {
    console.log('[Twilio IPC] Updating Twilio configuration');
    const result = await ipcRenderer.invoke('twilio:updateConfig', config);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update Twilio configuration');
    }
    
    console.log('[Twilio IPC] Configuration updated successfully');
  } catch (error) {
    console.error('[Twilio IPC] Failed to update configuration:', error);
    throw error;
  }
}

/**
 * Helper function to format phone number to E.164 format
 * Removes all non-digit characters except the leading +
 * 
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number in E.164 format
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return '';
  }

  // Remove all whitespace and special characters except + and digits
  let formatted = phoneNumber.trim().replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  return formatted;
}

/**
 * Helper function to format phone number to WhatsApp format
 * Adds 'whatsapp:' prefix if not already present
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {string} Phone number in WhatsApp format (whatsapp:+1234567890)
 */
export function formatWhatsAppNumber(phoneNumber) {
  if (!phoneNumber) {
    return '';
  }

  const formatted = formatPhoneNumber(phoneNumber);
  
  if (formatted.startsWith('whatsapp:')) {
    return formatted;
  }
  
  return `whatsapp:${formatted}`;
}

/**
 * Validate E.164 phone number format
 * E.164 format: +[country code][number] (e.g., +12345678900)
 * 
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid E.164 format
 */
export function isValidE164(phoneNumber) {
  if (!phoneNumber) {
    return false;
  }

  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Validate WhatsApp number format
 * WhatsApp format: whatsapp:+[country code][number]
 * 
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid WhatsApp format
 */
export function isValidWhatsAppNumber(phoneNumber) {
  if (!phoneNumber) {
    return false;
  }

  // WhatsApp format: whatsapp: followed by valid E.164 number
  if (!phoneNumber.startsWith('whatsapp:')) {
    return false;
  }

  const e164Part = phoneNumber.substring(9); // Remove 'whatsapp:' prefix
  return isValidE164(e164Part);
}

/**
 * Export all functions as default object for convenience
 */
export default {
  sendWhatsAppMessage,
  fetchMessage,
  listMessages,
  getTwilioConfig,
  updateTwilioConfig,
  formatPhoneNumber,
  formatWhatsAppNumber,
  isValidE164,
  isValidWhatsAppNumber
};

