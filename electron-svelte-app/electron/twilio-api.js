/**
 * Twilio WhatsApp API Handler for Electron Main Process
 * Handles all Twilio WhatsApp API calls without CORS restrictions
 *
 * This module provides functionality to send WhatsApp messages via Twilio API
 * All operations are performed in the main process to avoid CORS issues
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Twilio API credentials configuration
 * These credentials are loaded from environment variables
 */
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  // WhatsApp sender number (must be configured in Twilio Console)
  // Format: whatsapp:+1234567890
  whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || null,
  // WhatsApp template Content SID (must be approved in Twilio Console)
  templateContentSid: process.env.TWILIO_TEMPLATE_CONTENT_SID || null
};

/**
 * Twilio client instance
 * Initialized lazily when first needed
 */
let twilioClient = null;

/**
 * Initialize Twilio client with credentials
 * Creates a singleton instance of the Twilio client
 * 
 * @returns {Object} Twilio client instance
 * @throws {Error} If credentials are missing or invalid
 */
function initializeTwilioClient() {
  if (twilioClient) {
    return twilioClient;
  }

  if (!TWILIO_CONFIG.accountSid || !TWILIO_CONFIG.authToken) {
    throw new Error('Twilio credentials are not configured');
  }

  try {
    twilioClient = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
    console.log('[Twilio] Client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('[Twilio] Failed to initialize client:', error);
    throw new Error(`Failed to initialize Twilio client: ${error.message}`);
  }
}

/**
 * Send a WhatsApp template message via Twilio API
 * WhatsApp requires approved templates for business messaging
 *
 * @param {Object} messageData - Message data
 * @param {string} messageData.to - Recipient WhatsApp number (E.164 format: +1234567890)
 * @param {string} messageData.from - Sender WhatsApp number (E.164 format: +1234567890)
 * @param {string} messageData.contentSid - Template Content SID from Twilio (required)
 * @param {Object} messageData.contentVariables - Template variables as JSON object (optional)
 * @param {string} messageData.statusCallback - Callback URL for status updates (optional)
 * @returns {Promise<Object>} Message response from Twilio API
 * @throws {Error} If message sending fails
 */
export async function sendWhatsAppMessage(messageData) {
  try {
    console.log('[Twilio] Sending WhatsApp template message...');

    // Validate required fields
    if (!messageData.to || !messageData.to.trim()) {
      throw new Error('Recipient WhatsApp number is required');
    }

    if (!messageData.from || !messageData.from.trim()) {
      throw new Error('Sender WhatsApp number is required');
    }

    if (!messageData.contentSid || !messageData.contentSid.trim()) {
      throw new Error('Template Content SID is required');
    }

    // Initialize Twilio client
    const client = initializeTwilioClient();

    // Format phone numbers to WhatsApp format if not already formatted
    const toNumber = messageData.to.startsWith('whatsapp:')
      ? messageData.to
      : `whatsapp:${messageData.to}`;

    const fromNumber = messageData.from.startsWith('whatsapp:')
      ? messageData.from
      : `whatsapp:${messageData.from}`;

    // Prepare message parameters for template
    const messageParams = {
      contentSid: messageData.contentSid,
      from: fromNumber,
      to: toNumber
    };

    // Add template variables if provided
    if (messageData.contentVariables) {
      messageParams.contentVariables = JSON.stringify(messageData.contentVariables);
      console.log('[Twilio] Template variables:', messageData.contentVariables);
    }

    // Add optional status callback URL if provided
    if (messageData.statusCallback && messageData.statusCallback.trim()) {
      messageParams.statusCallback = messageData.statusCallback;
      console.log('[Twilio] Status callback URL set');
    }

    console.log('[Twilio] Sending to:', toNumber);
    console.log('[Twilio] From:', fromNumber);
    console.log('[Twilio] Template SID:', messageData.contentSid);

    // Send template message via Twilio API
    const message = await client.messages.create(messageParams);

    console.log('[Twilio] Template message sent successfully');
    console.log('[Twilio] Message SID:', message.sid);
    console.log('[Twilio] Status:', message.status);

    return {
      success: true,
      data: {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        numSegments: message.numSegments,
        numMedia: message.numMedia,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        direction: message.direction,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      }
    };
  } catch (error) {
    console.error('[Twilio] Failed to send WhatsApp template message:', error);

    // Extract meaningful error information
    const errorMessage = error.message || 'Unknown error occurred';
    const errorCode = error.code || null;
    const moreInfo = error.moreInfo || null;

    throw new Error(`Failed to send WhatsApp template: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}${moreInfo ? ` - More info: ${moreInfo}` : ''}`);
  }
}

/**
 * Fetch a specific message by SID
 * 
 * @param {string} messageSid - The Twilio message SID
 * @returns {Promise<Object>} Message details
 * @throws {Error} If message fetch fails
 */
export async function fetchMessage(messageSid) {
  try {
    console.log('[Twilio] Fetching message:', messageSid);
    
    if (!messageSid || !messageSid.trim()) {
      throw new Error('Message SID is required');
    }

    const client = initializeTwilioClient();
    const message = await client.messages(messageSid).fetch();

    console.log('[Twilio] Message fetched successfully');
    
    return {
      success: true,
      data: {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        numSegments: message.numSegments,
        numMedia: message.numMedia,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        direction: message.direction,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      }
    };
  } catch (error) {
    console.error('[Twilio] Failed to fetch message:', error);
    throw new Error(`Failed to fetch message: ${error.message}`);
  }
}

/**
 * List messages with optional filters
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.to - Filter by recipient number (optional)
 * @param {string} filters.from - Filter by sender number (optional)
 * @param {Date} filters.dateSent - Filter by sent date (optional)
 * @param {number} filters.limit - Maximum number of messages to return (default: 20, max: 1000)
 * @returns {Promise<Object>} List of messages
 * @throws {Error} If listing fails
 */
export async function listMessages(filters = {}) {
  try {
    console.log('[Twilio] Listing messages with filters:', filters);
    
    const client = initializeTwilioClient();
    
    // Prepare filter parameters
    const listParams = {};
    
    if (filters.to) {
      listParams.to = filters.to.startsWith('whatsapp:') ? filters.to : `whatsapp:${filters.to}`;
    }
    
    if (filters.from) {
      listParams.from = filters.from.startsWith('whatsapp:') ? filters.from : `whatsapp:${filters.from}`;
    }
    
    if (filters.dateSent) {
      listParams.dateSent = filters.dateSent;
    }
    
    if (filters.limit) {
      listParams.limit = Math.min(filters.limit, 1000);
    } else {
      listParams.limit = 20;
    }

    const messages = await client.messages.list(listParams);

    console.log('[Twilio] Messages listed successfully:', messages.length);
    
    return {
      success: true,
      data: messages.map(msg => ({
        sid: msg.sid,
        status: msg.status,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        numSegments: msg.numSegments,
        numMedia: msg.numMedia,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
        direction: msg.direction,
        price: msg.price,
        priceUnit: msg.priceUnit,
        errorCode: msg.errorCode,
        errorMessage: msg.errorMessage
      }))
    };
  } catch (error) {
    console.error('[Twilio] Failed to list messages:', error);
    throw new Error(`Failed to list messages: ${error.message}`);
  }
}

/**
 * Get Twilio configuration
 * Returns a copy of the configuration without sensitive data
 *
 * @returns {Object} Twilio configuration (without auth token)
 */
export function getTwilioConfig() {
  return {
    accountSid: TWILIO_CONFIG.accountSid,
    whatsappFrom: TWILIO_CONFIG.whatsappFrom,
    templateContentSid: TWILIO_CONFIG.templateContentSid,
    hasAuthToken: !!TWILIO_CONFIG.authToken
  };
}

/**
 * Update Twilio configuration
 * Allows updating credentials, WhatsApp sender number, and template SID
 *
 * @param {Object} config - Configuration updates
 * @param {string} config.accountSid - Twilio Account SID (optional)
 * @param {string} config.authToken - Twilio Auth Token (optional)
 * @param {string} config.whatsappFrom - WhatsApp sender number (optional)
 * @param {string} config.templateContentSid - WhatsApp template Content SID (optional)
 */
export function updateTwilioConfig(config) {
  if (config.accountSid) {
    TWILIO_CONFIG.accountSid = config.accountSid;
  }

  if (config.authToken) {
    TWILIO_CONFIG.authToken = config.authToken;
  }

  if (config.whatsappFrom) {
    TWILIO_CONFIG.whatsappFrom = config.whatsappFrom;
  }

  if (config.templateContentSid) {
    TWILIO_CONFIG.templateContentSid = config.templateContentSid;
  }

  // Reset client to force re-initialization with new credentials
  twilioClient = null;

  console.log('[Twilio] Configuration updated');
}

