/**
 * Zoho IPC Bridge for Renderer Process
 * Communicates with main process to send emails via Zoho API
 */

// @ts-ignore - window.require is available in Electron renderer with nodeIntegration
const { ipcRenderer } = window.require('electron');
import logger from './logger-ipc.js';

/**
 * Get email settings from localStorage
 * @returns {Object} Email settings
 */
function getEmailSettings() {
  return {
    provider: localStorage.getItem('email_provider') || 'zoho',
    cpanel: {
      host: localStorage.getItem('cpanel_host') || '',
      port: localStorage.getItem('cpanel_port') || '465',
      secure: localStorage.getItem('cpanel_secure') === 'true',
      user: localStorage.getItem('cpanel_user') || '',
      pass: localStorage.getItem('cpanel_pass') || ''
    }
  };
}

/**
 * Send email via main process
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.cc - CC email (optional)
 * @param {string} emailData.bcc - BCC email (optional)
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (HTML)
 * @param {string} emailData.format - Email format ('html' or 'plaintext')
 * @param {boolean} emailData.askReceipt - Request read receipt
 * @param {Array<File>} emailData.attachments - File attachments (optional)
 * @returns {Promise<Object>} Result
 */
export async function sendEmail(emailData) {
  try {
    logger.debug('email', 'Preparing email for IPC transfer', {
      to: emailData.to,
      subject: emailData.subject?.substring(0, 50),
      hasAttachments: emailData.attachments?.length > 0
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

    logger.debug('email', 'Sending email via IPC to main process', {
      provider: settings.provider
    });

    // Send to main process with settings
    const result = await ipcRenderer.invoke('zoho:sendEmail', processedData, settings);

    if (!result.success) {
      logger.error('email', 'Email send failed in main process', {
        error: result.error
      });
      throw new Error(result.error || 'Failed to send email');
    }

    logger.debug('email', 'Email sent successfully via IPC');
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

