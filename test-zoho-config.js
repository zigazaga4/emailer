#!/usr/bin/env node

/**
 * Test script to verify Zoho configuration
 * Tests token refresh and account access
 */

import https from 'https';

const ZOHO_CONFIG = {
  clientId: '1000.LW4UDAYY1JRRXB0NANAUTMSTTDXGBN',
  clientSecret: '1ba3eb51491b523c963afc0587dd9475712c667405',
  refreshToken: '1000.cc22315386cd2d28efccf8692fbd876a.61144f5c943828e0b64f2abaf2db1afd',
  accountId: '7827310000000002002',
  apiDomain: 'https://mail.zoho.eu',
  authDomain: 'https://accounts.zoho.eu'
};

const EMAIL_ALIASES = [
  'office@justhemis.com',
  'uk@justhemis.com',
  'usa@justhemis.com',
  'canada@justhemis.com',
  'australia@justhemis.com'
];

/**
 * Make HTTPS request
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
 * Test token refresh
 */
async function testTokenRefresh() {
  console.log('🔄 Testing token refresh...');
  
  try {
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
      console.error('❌ Token refresh failed:', response.data);
      return null;
    }
    
    console.log('✅ Token refresh successful!');
    console.log('   Access Token:', response.data.access_token.substring(0, 20) + '...');
    console.log('   Expires In:', response.data.expires_in, 'seconds');
    
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    return null;
  }
}

/**
 * Test account access
 */
async function testAccountAccess(accessToken) {
  console.log('\n📧 Testing account access...');
  
  try {
    const url = `${ZOHO_CONFIG.apiDomain}/api/accounts`;
    
    const response = await makeHttpsRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error('❌ Account access failed:', response.data);
      return false;
    }
    
    const accountData = response.data.data[0];
    
    console.log('✅ Account access successful!');
    console.log('   Account ID:', accountData.accountId);
    console.log('   Primary Email:', accountData.primaryEmailAddress);
    console.log('   Display Name:', accountData.displayName);
    console.log('\n📋 Email Aliases:');
    
    accountData.emailAlias.forEach(alias => {
      const isConfigured = EMAIL_ALIASES.includes(alias);
      const status = isConfigured ? '✅' : '⚠️';
      console.log(`   ${status} ${alias}`);
    });
    
    console.log('\n📤 Send Mail Addresses:');
    accountData.sendMailDetails.forEach(sendMail => {
      const isConfigured = EMAIL_ALIASES.includes(sendMail.fromAddress);
      const status = isConfigured ? '✅' : '⚠️';
      console.log(`   ${status} ${sendMail.fromAddress} (${sendMail.displayName})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Account access error:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Zoho Mail Configuration Test                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Configuration:');
  console.log('   Client ID:', ZOHO_CONFIG.clientId);
  console.log('   Account ID:', ZOHO_CONFIG.accountId);
  console.log('   API Domain:', ZOHO_CONFIG.apiDomain);
  console.log('   Auth Domain:', ZOHO_CONFIG.authDomain);
  console.log('\n🎯 Expected Email Aliases:');
  EMAIL_ALIASES.forEach(alias => {
    console.log('   -', alias);
  });
  console.log('\n' + '─'.repeat(60) + '\n');
  
  // Test token refresh
  const accessToken = await testTokenRefresh();
  if (!accessToken) {
    console.log('\n❌ Tests failed: Could not get access token');
    process.exit(1);
  }
  
  // Test account access
  const accountOk = await testAccountAccess(accessToken);
  if (!accountOk) {
    console.log('\n❌ Tests failed: Could not access account');
    process.exit(1);
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('✅ All tests passed!');
  console.log('🎉 Zoho configuration is working correctly!');
  console.log('─'.repeat(60) + '\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test error:', error);
  process.exit(1);
});

