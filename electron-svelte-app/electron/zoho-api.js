/**
 * Zoho API Handler for Electron Main Process
 * Handles all Zoho Mail API calls without CORS restrictions
 */

import https from 'https';

// Zoho API credentials for justhemis@justhemis.com
const ZOHO_CONFIG = {
  clientId: '1000.V1289BLO94K3R022OOI8NEACL8MDQD',
  clientSecret: '43d539d3a230b2ada5010d628936007d1dedb5e613',
  refreshToken: '1000.b4f230bb556f40fe1f2f08127af394e3.c5d5de1bca61f4877a74b1985f0f9a80',
  accountId: '7578861000000002002',
  senderEmail: 'justhemis@justhemis.com',
  apiDomain: 'https://mail.zoho.eu',
  authDomain: 'https://accounts.zoho.eu'
};

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
 * Build multipart form data body
 * @param {Object} fields - Form fields
 * @param {Array} files - Files to attach
 * @returns {Object} { body: Buffer, boundary: string }
 */
function buildMultipartBody(fields, files) {
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
 * @returns {Promise<Object>} API response
 */
export async function sendEmail(emailData) {
  try {
    console.log('[Main] Sending email via Zoho Mail API...');
    console.log('[Main] To:', emailData.to);
    console.log('[Main] Subject:', emailData.subject);
    
    // Get valid access token
    const token = await getValidAccessToken();
    
    // If there are attachments, use multipart
    if (emailData.attachments && emailData.attachments.length > 0) {
      return await sendEmailWithAttachments(emailData, token);
    }
    
    // Build request body
    const requestBody = {
      fromAddress: ZOHO_CONFIG.senderEmail,
      toAddress: emailData.to,
      subject: emailData.subject,
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
 * @returns {Promise<Object>} API response
 */
async function sendEmailWithAttachments(emailData, token) {
  console.log('[Main] Sending email with attachments...');
  console.log('[Main] Attachments:', emailData.attachments.map(f => f.name).join(', '));
  
  // Prepare form fields
  const fields = {
    fromAddress: ZOHO_CONFIG.senderEmail,
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
  
  // Build multipart body
  const { body, boundary } = buildMultipartBody(fields, emailData.attachments);
  
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

