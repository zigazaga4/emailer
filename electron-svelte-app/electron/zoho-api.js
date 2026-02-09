/**
 * Zoho API Handler for Electron Main Process
 * Handles all Zoho Mail API calls without CORS restrictions
 *
 * ⚠️ DEPRECATED: This file is no longer used by the application.
 * The app has been switched to use Zoho SMTP instead of the Zoho Mail API
 * to support custom display names for email aliases.
 *
 * See: electron/email-handler.js for the current SMTP implementation
 * See: ZOHO_SMTP_SETUP.md for setup instructions
 *
 * This file is kept for reference only.
 */

import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Zoho API credentials for office@justhemis.com
const ZOHO_CONFIG = {
  clientId: process.env.ZOHO_CLIENT_ID,
  clientSecret: process.env.ZOHO_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  accountId: process.env.ZOHO_ACCOUNT_ID,
  senderEmail: 'office@justhemis.com',
  apiDomain: 'https://mail.zoho.eu',
  authDomain: 'https://accounts.zoho.eu'
};

// Available email aliases for sending
const EMAIL_ALIASES = [
  { value: 'office@justhemis.com', label: 'Main Office (office@justhemis.com)' },
  { value: 'uk@justhemis.com', label: 'UK Office (uk@justhemis.com)' },
  { value: 'usa@justhemis.com', label: 'USA Office (usa@justhemis.com)' },
  { value: 'canada@justhemis.com', label: 'Canada Office (canada@justhemis.com)' },
  { value: 'australia@justhemis.com', label: 'Australia Office (australia@justhemis.com)' }
];

// Token storage
let accessToken = null;
let tokenExpiry = null;
let refreshInProgress = false;
let refreshPromise = null;

/**
 * Make HTTPS request
 * @param {string} url - Full URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
function makeHttpsRequest(url, options = {}) {
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
 * Check if token is expired
 * @returns {boolean} True if expired
 */
function isTokenExpired() {
  if (!accessToken || !tokenExpiry) {
    return true;
  }
  return Date.now() >= tokenExpiry;
}

/**
 * Refresh access token
 * @returns {Promise<string>} New access token
 */
async function refreshAccessToken() {
  // If refresh is already in progress, return the existing promise
  if (refreshInProgress && refreshPromise) {
    console.log('[Main] Token refresh already in progress, waiting...');
    return refreshPromise;
  }

  refreshInProgress = true;
  
  refreshPromise = (async () => {
    try {
      console.log('[Main] Refreshing Zoho access token...');
      
      const url = new URL(`${ZOHO_CONFIG.authDomain}/oauth/v2/token`);
      url.searchParams.append('refresh_token', ZOHO_CONFIG.refreshToken);
      url.searchParams.append('grant_type', 'refresh_token');
      url.searchParams.append('client_id', ZOHO_CONFIG.clientId);
      url.searchParams.append('client_secret', ZOHO_CONFIG.clientSecret);
      
      const response = await makeHttpsRequest(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (!response.ok || !response.data.access_token) {
        throw new Error('No access token in response');
      }
      
      // Save the new token
      accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      tokenExpiry = Date.now() + ((expiresIn - 300) * 1000); // 5 min buffer
      
      console.log('[Main] Successfully refreshed Zoho access token');
      
      return accessToken;
    } catch (error) {
      console.error('[Main] Failed to refresh access token:', error);
      throw error;
    } finally {
      refreshInProgress = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

/**
 * Get valid access token (refresh if needed)
 * @returns {Promise<string>} Valid access token
 */
async function getValidAccessToken() {
  if (isTokenExpired()) {
    console.log('[Main] Access token expired, refreshing...');
    await refreshAccessToken();
  }
  return accessToken;
}

/**
 * Extract inline images from HTML and convert to attachments
 * Note: Zoho Mail API does not support inline images with CID references
 * So we keep base64 images in the HTML as-is (some email clients will display them)
 * @param {string} html - HTML content
 * @returns {Object} { html: string, imageAttachments: Array }
 */
function extractInlineImages(html) {
  // For now, we'll keep base64 images in the HTML
  // Some email clients (like Gmail web) will display them
  // Others may not, but there's no way around this with Zoho Mail API
  return {
    html: html,
    imageAttachments: []
  };
}

/**
 * Build multipart form data body with inline images
 * @param {Object} fields - Form fields
 * @param {Array} files - Files to attach
 * @param {Array} inlineImages - Inline images with CID
 * @returns {Object} { body: Buffer, boundary: string }
 */
function buildMultipartBody(fields, files, inlineImages = []) {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
  const parts = [];

  // If we have inline images, we need to create a multipart/related structure for the content
  if (inlineImages.length > 0) {
    const relatedBoundary = `----RelatedBoundary${Math.random().toString(36).substring(2)}`;

    // Add all non-content fields first
    for (const [key, value] of Object.entries(fields)) {
      if (key !== 'content' && value !== undefined && value !== null && value !== '') {
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${value}\r\n`
        );
      }
    }

    // Add content as multipart/related with inline images
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="content"\r\n` +
      `Content-Type: multipart/related; boundary="${relatedBoundary}"\r\n\r\n`
    );

    // Add HTML part
    parts.push(
      `--${relatedBoundary}\r\n` +
      `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
      `${fields.content}\r\n`
    );

    // Add inline images
    for (const image of inlineImages) {
      parts.push(
        `--${relatedBoundary}\r\n` +
        `Content-Type: ${image.type}\r\n` +
        `Content-Transfer-Encoding: base64\r\n` +
        `Content-ID: <${image.cid}>\r\n` +
        `Content-Disposition: inline; filename="${image.name}"\r\n\r\n` +
        `${image.data}\r\n`
      );
    }

    // Close related boundary
    parts.push(`--${relatedBoundary}--\r\n`);
  } else {
    // No inline images, use simple form-data
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${value}\r\n`
        );
      }
    }
  }

  // Add file attachments
  for (const file of files) {
    const fileBuffer = Buffer.from(file.data, 'base64');

    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="attachments"; filename="${file.name}"\r\n` +
      `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
    );
    parts.push(fileBuffer);
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
 * Send email via Zoho Mail API
 * @param {Object} emailData - Email data
 * @param {string} fromAddress - Email address to send from (optional, defaults to main office)
 * @returns {Promise<Object>} API response
 */
export async function sendEmail(emailData, fromAddress = null) {
  try {
    // Use provided fromAddress or default to main office email
    const senderEmail = fromAddress || ZOHO_CONFIG.senderEmail;

    console.log('[Main] Sending email via Zoho Mail API...');
    console.log('[Main] From:', senderEmail);
    console.log('[Main] To:', emailData.to);
    console.log('[Main] Subject:', emailData.subject);

    // Get valid access token
    const token = await getValidAccessToken();

    // Extract inline images from HTML
    const { html: processedHtml, imageAttachments } = extractInlineImages(emailData.body);

    // If there are inline images or attachments, use multipart
    if ((emailData.attachments && emailData.attachments.length > 0) || imageAttachments.length > 0) {
      const modifiedEmailData = {
        ...emailData,
        body: processedHtml
      };
      return await sendEmailWithAttachments(modifiedEmailData, token, imageAttachments, senderEmail);
    }

    // Build request body
    const requestBody = {
      fromAddress: senderEmail,
      toAddress: emailData.to,
      subject: emailData.subject,
      content: processedHtml,
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

    // Send API request
    const url = `${ZOHO_CONFIG.apiDomain}/api/accounts/${ZOHO_CONFIG.accountId}/messages`;

    const response = await makeHttpsRequest(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('[Main] Zoho API error:', response.data);
      throw new Error(response.data.message || `Failed to send email: ${response.status}`);
    }

    console.log('[Main] Email sent successfully!');
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('[Main] Failed to send email:', error);
    throw error;
  }
}

/**
 * Send email with attachments
 * @param {Object} emailData - Email data
 * @param {string} token - Access token
 * @param {Array} inlineImages - Inline images with CID
 * @param {string} fromAddress - Email address to send from
 * @returns {Promise<Object>} API response
 */
async function sendEmailWithAttachments(emailData, token, inlineImages = [], fromAddress = null) {
  const senderEmail = fromAddress || ZOHO_CONFIG.senderEmail;

  console.log('[Main] Sending email with attachments...');
  console.log('[Main] From:', senderEmail);
  if (emailData.attachments && emailData.attachments.length > 0) {
    console.log('[Main] Attachments:', emailData.attachments.map(f => f.name).join(', '));
  }
  if (inlineImages.length > 0) {
    console.log('[Main] Inline images:', inlineImages.length);
  }

  // Prepare form fields
  const fields = {
    fromAddress: senderEmail,
    toAddress: emailData.to,
    subject: emailData.subject,
    content: emailData.body,
    mailFormat: emailData.format || 'html',
    askReceipt: emailData.askReceipt ? 'yes' : 'no'
  };

  // Add CC/BCC if provided
  if (emailData.cc && emailData.cc.trim()) {
    fields.ccAddress = emailData.cc.trim();
  }
  if (emailData.bcc && emailData.bcc.trim()) {
    fields.bccAddress = emailData.bcc.trim();
  }

  // Build multipart body with inline images
  const attachments = emailData.attachments || [];
  const { body, boundary } = buildMultipartBody(fields, attachments, inlineImages);

  // Send request
  const url = `${ZOHO_CONFIG.apiDomain}/api/accounts/${ZOHO_CONFIG.accountId}/messages`;
  const urlObj = new URL(url);

  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${token}`,
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
            console.log('[Main] Email with attachments sent successfully!');
            resolve({
              success: true,
              data: jsonData
            });
          } else {
            console.error('[Main] Zoho API error:', jsonData);
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
}

// Export EMAIL_ALIASES for use in UI
export { EMAIL_ALIASES };
