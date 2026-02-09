/**
 * Email IPC Bridge for Renderer Process
 * Communicates with main process to send emails via SendGrid API
 */

// @ts-ignore - window.require is available in Electron renderer with nodeIntegration
const { ipcRenderer } = window.require('electron');
import logger from './logger-ipc.js';

/**
 * Default slogan color (turquoise)
 */
const DEFAULT_SLOGAN_COLOR = '#40E0D0';

/**
 * Get email settings from localStorage
 * @returns {Object} Email settings
 */
function getEmailSettings() {
  return {
    fromAddress: localStorage.getItem('email_from_address') || 'office@justhemis.com',
    sloganColor: localStorage.getItem('email_slogan_color') || DEFAULT_SLOGAN_COLOR
  };
}

/**
 * Send email via main process (SendGrid API)
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.cc - CC email (optional)
 * @param {string} emailData.bcc - BCC email (optional)
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (HTML)
 * @param {string} emailData.format - Email format ('html' or 'plaintext')
 * @param {boolean} emailData.askReceipt - Request read receipt
 * @param {Array<File>} emailData.attachments - File attachments (optional)
 * @param {string} customFromAddress - Custom from address (optional, overrides localStorage)
 * @returns {Promise<Object>} Result
 */
export async function sendEmail(emailData, customFromAddress = null) {
  try {
    logger.debug('email', 'Preparing email for IPC transfer', {
      to: emailData.to,
      subject: emailData.subject?.substring(0, 50),
      hasAttachments: emailData.attachments?.length > 0,
      customFromAddress
    });

    // Convert File objects to base64 for IPC transfer
    const processedData = { ...emailData };

    if (emailData.attachments && emailData.attachments.length > 0) {
      processedData.attachments = await Promise.all(
        emailData.attachments.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );

          return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          };
        })
      );
    }

    // Get email settings from localStorage
    const settings = getEmailSettings();

    // Override fromAddress if custom one is provided
    if (customFromAddress) {
      settings.fromAddress = customFromAddress;
    }

    // Add slogan color to processed data for email template
    processedData.sloganColor = settings.sloganColor;

    logger.debug('email', 'Sending email via IPC to main process (SendGrid)', {
      fromAddress: settings.fromAddress,
      sloganColor: settings.sloganColor
    });

    // Send to main process with settings
    const result = await ipcRenderer.invoke('zoho:sendEmail', processedData, settings);

    if (!result.success) {
      logger.error('email', 'Email send failed in main process', {
        error: result.error
      });
      throw new Error(result.error || 'Failed to send email');
    }

    logger.debug('email', 'Email sent successfully via SendGrid');
    return result.data;
  } catch (error) {
    console.error('[Renderer] Failed to send email:', error);
    logger.error('email', 'Failed to send email via IPC', {
      error: error.message
    });
    throw error;
  }
}

export default {
  sendEmail
};
