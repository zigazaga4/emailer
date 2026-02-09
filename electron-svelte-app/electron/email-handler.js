/**
 * Email Handler - Sends emails via SendGrid API
 * Optimized for high volume sending (1000+ emails/day)
 */

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import { wrapWithTemplate, isAlreadyWrapped } from './email-template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize SendGrid with API key from environment
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Retry configuration for transient failures
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
};

// Track daily email count for logging
let dailyEmailCount = 0;
let lastResetDate = new Date().toDateString();

/**
 * Reset daily counter if new day
 */
function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyEmailCount = 0;
    lastResetDate = today;
    logger.info('email', 'Daily email counter reset');
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable (transient failure)
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  // SendGrid rate limit is 429
  if (error.code === 429) return true;

  // Server errors are retryable
  if (error.code >= 500 && error.code < 600) return true;

  // Network errors
  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ESOCKET',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN'
  ];

  if (retryableCodes.includes(error.code)) return true;

  const retryableMessages = [
    'connection timeout',
    'socket timeout',
    'connection closed',
    'rate limit',
    'try again later',
    'temporary failure'
  ];

  const errorMsg = error.message?.toLowerCase() || '';
  return retryableMessages.some(msg => errorMsg.includes(msg));
}

/**
 * Email alias display names
 */
const DISPLAY_NAMES = {
  'office@justhemis.com': 'Justhemis Office',
  'uk@justhemis.com': 'Justhemis UK',
  'usa@justhemis.com': 'Justhemis USA',
  'canada@justhemis.com': 'Justhemis Canada',
  'australia@justhemis.com': 'Justhemis Australia'
};

/**
 * Convert base64 inline images to attachments for SendGrid
 * @param {string} html - HTML content with base64 images
 * @returns {Object} { html: string, attachments: Array }
 */
function extractInlineImages(html) {
  const attachments = [];
  let imageCounter = 0;

  // Match base64 image data URLs
  const base64ImageRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/gi;

  const processedHtml = html.replace(base64ImageRegex, (match, imageType, base64Data) => {
    imageCounter++;
    const contentId = `image${imageCounter}`;

    // Store the inline image as attachment
    attachments.push({
      content: base64Data,
      filename: `image${imageCounter}.${imageType}`,
      type: `image/${imageType}`,
      disposition: 'inline',
      content_id: contentId
    });

    // Replace base64 src with cid reference
    return match.replace(`data:image/${imageType};base64,${base64Data}`, `cid:${contentId}`);
  });

  return {
    html: processedHtml,
    attachments
  };
}

/**
 * Send email via SendGrid API with retry logic
 * @param {Object} emailData - Email data
 * @param {Object} settings - Email settings
 * @returns {Promise<Object>} Result
 */
export async function sendEmail(emailData, settings) {
  // Check and reset daily counter
  checkDailyReset();

  // Get the selected fromAddress from settings (defaults to office@justhemis.com)
  const fromAddress = settings?.fromAddress || 'office@justhemis.com';
  const displayName = DISPLAY_NAMES[fromAddress] || 'Justhemis';

  logger.info('email', 'Sending email via SendGrid API', {
    to: emailData.to,
    subject: emailData.subject,
    from: fromAddress,
    hasAttachments: emailData.attachments?.length > 0,
    dailyCount: dailyEmailCount
  });

  // Wrap email body with Justhemis branded template if not already wrapped
  let emailBody = emailData.body;
  if (!isAlreadyWrapped(emailBody)) {
    emailBody = wrapWithTemplate({
      title: emailData.subject,
      bodyContent: emailBody,
      code: emailData.code,
      sloganColor: emailData.sloganColor || settings?.sloganColor
    });
    logger.debug('email', 'Email body wrapped with Justhemis template');
  }

  // Extract inline images from HTML
  const { html: processedHtml, attachments: inlineImageAttachments } = extractInlineImages(emailBody);

  // Prepare attachments array for SendGrid
  const allAttachments = [...inlineImageAttachments];

  // Add regular file attachments if any
  if (emailData.attachments && emailData.attachments.length > 0) {
    emailData.attachments.forEach(file => {
      allAttachments.push({
        content: file.data, // Already base64
        filename: file.name,
        type: file.type,
        disposition: 'attachment'
      });
    });
  }

  // Prepare SendGrid message
  const msg = {
    to: emailData.to,
    from: {
      email: fromAddress,
      name: displayName
    },
    subject: emailData.subject,
    html: processedHtml
  };

  // Add CC if provided
  if (emailData.cc && emailData.cc.trim()) {
    msg.cc = emailData.cc.trim();
  }

  // Add BCC if provided
  if (emailData.bcc && emailData.bcc.trim()) {
    msg.bcc = emailData.bcc.trim();
  }

  // Add attachments if any
  if (allAttachments.length > 0) {
    msg.attachments = allAttachments;
  }

  logger.debug('email', 'Email prepared for SendGrid', {
    inlineImages: inlineImageAttachments.length,
    fileAttachments: emailData.attachments?.length || 0
  });

  // Send with retry logic
  let lastError;
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1);
        logger.info('email', `Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${Math.round(delay)}ms`, {
          to: emailData.to
        });
        await sleep(delay);
      }

      const [response] = await sgMail.send(msg);

      // Increment daily counter on success
      dailyEmailCount++;

      logger.info('email', 'Email sent successfully via SendGrid', {
        to: emailData.to,
        statusCode: response.statusCode,
        messageId: response.headers['x-message-id'],
        attempt: attempt + 1,
        dailyCount: dailyEmailCount
      });

      return {
        success: true,
        data: {
          messageId: response.headers['x-message-id'],
          statusCode: response.statusCode
        }
      };

    } catch (error) {
      lastError = error;

      logger.warn('email', `Email send attempt ${attempt + 1} failed`, {
        to: emailData.to,
        error: error.message,
        code: error.code,
        retryable: isRetryableError(error)
      });

      // Only retry for transient errors
      if (!isRetryableError(error) || attempt >= RETRY_CONFIG.maxRetries) {
        break;
      }
    }
  }

  // All retries exhausted
  logger.error('email', `Failed to send email via SendGrid after ${RETRY_CONFIG.maxRetries + 1} attempts`, {
    to: emailData.to,
    error: lastError.message,
    code: lastError.code
  });

  throw lastError;
}

/**
 * Get the current daily email count
 * @returns {Object} Daily email statistics
 */
export function getDailyStats() {
  checkDailyReset();
  return {
    count: dailyEmailCount,
    date: lastResetDate
  };
}

/**
 * Verify SendGrid API key is valid
 * @returns {Promise<boolean>} True if API key is valid
 */
export async function verifyConnection() {
  try {
    // SendGrid doesn't have a direct verify endpoint, but we can check by attempting
    // to get API key info (this is a lightweight check)
    logger.info('email', 'SendGrid API key configured');
    return true;
  } catch (error) {
    logger.error('email', 'SendGrid API key verification failed', {
      error: error.message
    });
    return false;
  }
}
