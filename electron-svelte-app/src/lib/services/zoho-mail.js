/**
 * Zoho Mail API Service
 * Handles sending emails via Zoho Mail API
 */

import https from 'https';
import zohoAuthService from './zoho-auth.js';

/**
 * ZohoMailService class
 * Provides methods to send emails through Zoho Mail API
 */
class ZohoMailService {
  constructor() {
    this.authService = zohoAuthService;
  }

  /**
   * Make HTTPS request using Node.js https module (no CORS issues)
   * @param {string} url - Full URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeHttpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ ok: true, status: res.statusCode, data: jsonData });
            } else {
              resolve({ ok: false, status: res.statusCode, data: jsonData });
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Send an email via Zoho Mail API
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email address (required)
   * @param {string} emailData.cc - CC email addresses (optional, comma-separated)
   * @param {string} emailData.bcc - BCC email addresses (optional, comma-separated)
   * @param {string} emailData.subject - Email subject (required)
   * @param {string} emailData.body - Email body content (required)
   * @param {string} emailData.format - Email format: 'html' or 'plaintext' (default: 'html')
   * @param {boolean} emailData.askReceipt - Request read receipt (default: false)
   * @param {Array<File>} emailData.attachments - Array of File objects (optional)
   * @returns {Promise<Object>} API response
   */
  async sendEmail(emailData) {
    try {
      // Validate required fields
      if (!emailData.to || !emailData.to.trim()) {
        throw new Error('Recipient email address is required');
      }
      
      if (!emailData.subject || !emailData.subject.trim()) {
        throw new Error('Email subject is required');
      }
      
      if (!emailData.body || !emailData.body.trim()) {
        throw new Error('Email body is required');
      }

      // Get valid access token
      const accessToken = await this.authService.getValidAccessToken();
      const config = this.authService.getConfig();

      // If there are attachments, use multipart form data
      if (emailData.attachments && emailData.attachments.length > 0) {
        return await this.sendEmailWithAttachments(emailData, accessToken, config);
      }

      // Build request body
      const requestBody = {
        fromAddress: config.senderEmail,
        toAddress: emailData.to.trim(),
        subject: emailData.subject.trim(),
        content: emailData.body,
        mailFormat: emailData.format || 'html',
        askReceipt: emailData.askReceipt ? 'yes' : 'no'
      };

      // Add CC if provided
      if (emailData.cc && emailData.cc.trim()) {
        requestBody.ccAddress = emailData.cc.trim();
      }

      // Add BCC if provided
      if (emailData.bcc && emailData.bcc.trim()) {
        requestBody.bccAddress = emailData.bcc.trim();
      }

      console.log('Sending email via Zoho Mail API...');
      console.log('To:', requestBody.toAddress);
      console.log('Subject:', requestBody.subject);

      // Send API request using Node.js https module
      const url = `${config.apiDomain}/api/accounts/${config.accountId}/messages`;

      const response = await this.makeHttpsRequest(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Zoho-oauthtoken ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error('Zoho API error:', response.data);
        throw new Error(response.data.message || `Failed to send email: ${response.status}`);
      }

      console.log('Email sent successfully!');
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Build multipart form data body
   * @param {Object} fields - Form fields
   * @param {Array} files - Files to attach
   * @returns {Promise<{body: Buffer, boundary: string}>} Multipart body and boundary
   */
  async buildMultipartBody(fields, files) {
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    const parts = [];

    // Add text fields
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${value}\r\n`
        );
      }
    }

    // Add file attachments
    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();
      const fileData = Buffer.from(fileBuffer);

      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="attachments"; filename="${file.name}"\r\n` +
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
      );
      parts.push(fileData);
      parts.push('\r\n');
    }

    // Add closing boundary
    parts.push(`--${boundary}--\r\n`);

    // Combine all parts
    const buffers = parts.map(part =>
      typeof part === 'string' ? Buffer.from(part, 'utf8') : part
    );

    return {
      body: Buffer.concat(buffers),
      boundary
    };
  }

  /**
   * Send email with attachments using multipart form data
   * @param {Object} emailData - Email data with attachments
   * @param {string} accessToken - Valid access token
   * @param {Object} config - Zoho config
   * @returns {Promise<Object>} API response
   */
  async sendEmailWithAttachments(emailData, accessToken, config) {
    try {
      console.log('Sending email with attachments via Zoho Mail API...');
      console.log('Attachments:', emailData.attachments.map(f => f.name).join(', '));

      // Prepare form fields
      const fields = {
        fromAddress: config.senderEmail,
        toAddress: emailData.to.trim(),
        subject: emailData.subject.trim(),
        content: emailData.body,
        mailFormat: emailData.format || 'html',
        askReceipt: emailData.askReceipt ? 'yes' : 'no'
      };

      // Add CC if provided
      if (emailData.cc && emailData.cc.trim()) {
        fields.ccAddress = emailData.cc.trim();
      }

      // Add BCC if provided
      if (emailData.bcc && emailData.bcc.trim()) {
        fields.bccAddress = emailData.bcc.trim();
      }

      // Build multipart body
      const { body, boundary } = await this.buildMultipartBody(fields, emailData.attachments);

      // Send API request
      const url = `${config.apiDomain}/api/accounts/${config.accountId}/messages`;
      const urlObj = new URL(url);

      return new Promise((resolve, reject) => {
        const requestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
          }
        };

        const req = https.request(requestOptions, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);

              if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Email with attachments sent successfully!');
                resolve({
                  success: true,
                  data: jsonData
                });
              } else {
                console.error('Zoho API error:', jsonData);
                reject(new Error(jsonData.message || `Failed to send email: ${res.statusCode}`));
              }
            } catch (error) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.write(body);
        req.end();
      });

    } catch (error) {
      console.error('Failed to send email with attachments:', error);
      throw error;
    }
  }

  /**
   * Test the Zoho Mail API connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      console.log('Testing Zoho Mail API connection...');
      
      // Try to get a valid access token
      const accessToken = await this.authService.getValidAccessToken();
      
      if (!accessToken) {
        throw new Error('Failed to obtain access token');
      }
      
      console.log('Zoho Mail API connection successful!');
      return true;
    } catch (error) {
      console.error('Zoho Mail API connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const zohoMailService = new ZohoMailService();

// Export the service instance
export { zohoMailService };
export default zohoMailService;

