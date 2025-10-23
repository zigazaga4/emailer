/**
 * Zoho OAuth Authentication Service
 * Handles access token refresh and storage
 */

import https from 'https';

// Zoho API credentials
const ZOHO_CONFIG = {
  clientId: '1000.EYMFVWB0IBLK1GCDDM75VKL4ZWT0OV',
  clientSecret: 'a70e76555d6b5fe8adcf9dfdd7736f2f5bde568fd9',
  refreshToken: '1000.9f02913cd8800924dca98b78763b35e5.4e0361a53f684aaf2fa28bb83039d9c1',
  accountId: '7153061000000002002',
  senderEmail: 'noreply@justhemis.com',
  apiDomain: 'https://mail.zoho.eu',
  authDomain: 'https://accounts.zoho.eu'
};

// Token storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'zoho_access_token',
  TOKEN_EXPIRY: 'zoho_token_expiry'
};

/**
 * ZohoAuthService class
 * Manages OAuth tokens with automatic refresh
 */
class ZohoAuthService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshInProgress = false;
    this.refreshPromise = null;
    
    // Load stored token on initialization
    this.loadStoredToken();
  }

  /**
   * Load token from localStorage
   */
  loadStoredToken() {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      
      if (storedToken && storedExpiry) {
        this.accessToken = storedToken;
        this.tokenExpiry = parseInt(storedExpiry, 10);
        
        console.log('Loaded stored Zoho access token');
      }
    } catch (error) {
      console.error('Failed to load stored token:', error);
    }
  }

  /**
   * Save token to localStorage
   * @param {string} token - Access token
   * @param {number} expiresIn - Token validity in seconds
   */
  saveToken(token, expiresIn) {
    try {
      // Calculate expiry time (current time + expires_in - 5 minute buffer)
      const expiryTime = Date.now() + ((expiresIn - 300) * 1000);
      
      this.accessToken = token;
      this.tokenExpiry = expiryTime;
      
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      console.log('Saved Zoho access token, expires at:', new Date(expiryTime).toISOString());
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Check if current token is expired or about to expire
   * @returns {boolean} True if token needs refresh
   */
  isTokenExpired() {
    if (!this.accessToken || !this.tokenExpiry) {
      return true;
    }
    
    // Check if token is expired or will expire in the next minute
    return Date.now() >= this.tokenExpiry;
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
              resolve(jsonData);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(jsonData)}`));
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
   * Refresh the access token using refresh token
   * @returns {Promise<string>} New access token
   */
  async refreshAccessToken() {
    // If refresh is already in progress, return the existing promise
    if (this.refreshInProgress && this.refreshPromise) {
      console.log('Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.refreshInProgress = true;

    this.refreshPromise = (async () => {
      try {
        console.log('Refreshing Zoho access token...');

        const url = new URL(`${ZOHO_CONFIG.authDomain}/oauth/v2/token`);
        url.searchParams.append('refresh_token', ZOHO_CONFIG.refreshToken);
        url.searchParams.append('grant_type', 'refresh_token');
        url.searchParams.append('client_id', ZOHO_CONFIG.clientId);
        url.searchParams.append('client_secret', ZOHO_CONFIG.clientSecret);

        const data = await this.makeHttpsRequest(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (!data.access_token) {
          throw new Error('No access token in response');
        }

        // Save the new token
        this.saveToken(data.access_token, data.expires_in || 3600);

        console.log('Successfully refreshed Zoho access token');

        return this.accessToken;
      } catch (error) {
        console.error('Failed to refresh access token:', error);
        throw error;
      } finally {
        this.refreshInProgress = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Get a valid access token (refresh if needed)
   * @returns {Promise<string>} Valid access token
   */
  async getValidAccessToken() {
    // Check if token needs refresh
    if (this.isTokenExpired()) {
      console.log('Access token expired or missing, refreshing...');
      await this.refreshAccessToken();
    }
    
    return this.accessToken;
  }

  /**
   * Get Zoho configuration
   * @returns {Object} Zoho config
   */
  getConfig() {
    return { ...ZOHO_CONFIG };
  }

  /**
   * Clear stored tokens (for logout/reset)
   */
  clearTokens() {
    this.accessToken = null;
    this.tokenExpiry = null;
    
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      console.log('Cleared Zoho tokens');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
}

// Create singleton instance
const zohoAuthService = new ZohoAuthService();

// Export the service instance and config
export { zohoAuthService, ZOHO_CONFIG };
export default zohoAuthService;

