/**
 * Zoho IPC Bridge for Renderer Process
 * Communicates with main process to send emails via Zoho API
 */

const { ipcRenderer } = window.require('electron');

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
    
    // Send to main process
    const result = await ipcRenderer.invoke('zoho:sendEmail', processedData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    return result.data;
  } catch (error) {
    console.error('[Renderer] Failed to send email:', error);
    throw error;
  }
}

export default {
  sendEmail
};

