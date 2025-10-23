/**
 * Twilio Regulatory Bundle Management Module
 *
 * Handles regulatory compliance requirements for Twilio phone numbers
 * including bundle creation, approval checking, and assignment to phone numbers
 *
 * UK phone numbers require approved regulatory bundles before they can be used
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
  authToken: process.env.TWILIO_AUTH_TOKEN || ''
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
    console.log('[Twilio Regulatory] Client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to initialize client:', error);
    throw new Error(`Failed to initialize Twilio client: ${error.message}`);
  }
}

/**
 * List all regulatory bundles in the account
 * Shows bundle SID, friendly name, status, and type
 * 
 * @returns {Promise<Array>} Array of bundle objects
 * @throws {Error} If listing fails
 */
export async function listRegulatoryBundles() {
  try {
    console.log('[Twilio Regulatory] Listing all regulatory bundles...');
    
    const client = initializeTwilioClient();
    const bundles = await client.numbers.v2.regulatoryCompliance.bundles.list();
    
    const bundleData = bundles.map(bundle => ({
      sid: bundle.sid,
      friendlyName: bundle.friendlyName,
      status: bundle.status,
      regulationType: bundle.regulationType,
      isoCountry: bundle.isoCountry,
      endUserType: bundle.endUserType,
      dateCreated: bundle.dateCreated,
      dateUpdated: bundle.dateUpdated,
      validUntil: bundle.validUntil
    }));
    
    console.log(`[Twilio Regulatory] Found ${bundleData.length} bundles`);
    bundleData.forEach(bundle => {
      console.log(`  - ${bundle.friendlyName} (${bundle.sid}): ${bundle.status}`);
    });
    
    return bundleData;
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to list bundles:', error);
    throw new Error(`Failed to list regulatory bundles: ${error.message}`);
  }
}

/**
 * Get details of a specific regulatory bundle
 * 
 * @param {string} bundleSid - Bundle SID (starts with BU...)
 * @returns {Promise<Object>} Bundle details
 * @throws {Error} If bundle not found or fetch fails
 */
export async function getRegulatoryBundle(bundleSid) {
  try {
    console.log(`[Twilio Regulatory] Fetching bundle: ${bundleSid}`);
    
    const client = initializeTwilioClient();
    const bundle = await client.numbers.v2.regulatoryCompliance
      .bundles(bundleSid)
      .fetch();
    
    const bundleData = {
      sid: bundle.sid,
      friendlyName: bundle.friendlyName,
      status: bundle.status,
      regulationType: bundle.regulationType,
      isoCountry: bundle.isoCountry,
      endUserType: bundle.endUserType,
      dateCreated: bundle.dateCreated,
      dateUpdated: bundle.dateUpdated,
      validUntil: bundle.validUntil,
      statusCallback: bundle.statusCallback
    };
    
    console.log(`[Twilio Regulatory] Bundle status: ${bundleData.status}`);
    return bundleData;
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to fetch bundle:', error);
    throw new Error(`Failed to fetch regulatory bundle: ${error.message}`);
  }
}

/**
 * Find approved UK Local Business bundles
 * Filters bundles by country (GB) and approval status
 * 
 * @returns {Promise<Array>} Array of approved UK bundles
 * @throws {Error} If listing fails
 */
export async function findApprovedUKBundles() {
  try {
    console.log('[Twilio Regulatory] Finding approved UK bundles...');
    
    const allBundles = await listRegulatoryBundles();
    
    const approvedUKBundles = allBundles.filter(bundle => 
      bundle.isoCountry === 'GB' && 
      bundle.status === 'twilio-approved'
    );
    
    console.log(`[Twilio Regulatory] Found ${approvedUKBundles.length} approved UK bundles`);
    return approvedUKBundles;
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to find approved UK bundles:', error);
    throw new Error(`Failed to find approved UK bundles: ${error.message}`);
  }
}

/**
 * Assign a regulatory bundle to a phone number
 * The bundle must be approved before assignment
 * 
 * @param {string} phoneNumberSid - Phone number SID (starts with PN...)
 * @param {string} bundleSid - Regulatory bundle SID (starts with BU...)
 * @returns {Promise<Object>} Assignment result
 * @throws {Error} If assignment fails
 */
export async function assignBundleToPhoneNumber(phoneNumberSid, bundleSid) {
  try {
    console.log(`[Twilio Regulatory] Assigning bundle ${bundleSid} to phone number ${phoneNumberSid}...`);
    
    // First verify the bundle is approved
    const bundle = await getRegulatoryBundle(bundleSid);
    
    if (bundle.status !== 'twilio-approved') {
      throw new Error(
        `Bundle is not approved. Current status: ${bundle.status}. ` +
        `Bundle must be in 'twilio-approved' status before assignment.`
      );
    }
    
    const client = initializeTwilioClient();
    
    // Update the phone number with the bundle SID
    const phoneNumber = await client.incomingPhoneNumbers(phoneNumberSid)
      .update({
        bundleSid: bundleSid
      });
    
    console.log('[Twilio Regulatory] Bundle assigned successfully');
    
    return {
      success: true,
      phoneNumberSid: phoneNumber.sid,
      phoneNumber: phoneNumber.phoneNumber,
      bundleSid: phoneNumber.bundleSid,
      status: phoneNumber.status
    };
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to assign bundle:', error);
    throw new Error(`Failed to assign bundle to phone number: ${error.message}`);
  }
}

/**
 * Get phone number details including regulatory bundle assignment
 * 
 * @param {string} phoneNumberSid - Phone number SID (starts with PN...)
 * @returns {Promise<Object>} Phone number details
 * @throws {Error} If fetch fails
 */
export async function getPhoneNumberDetails(phoneNumberSid) {
  try {
    console.log(`[Twilio Regulatory] Fetching phone number details: ${phoneNumberSid}`);
    
    const client = initializeTwilioClient();
    const phoneNumber = await client.incomingPhoneNumbers(phoneNumberSid).fetch();
    
    const details = {
      sid: phoneNumber.sid,
      phoneNumber: phoneNumber.phoneNumber,
      friendlyName: phoneNumber.friendlyName,
      bundleSid: phoneNumber.bundleSid,
      status: phoneNumber.status,
      capabilities: phoneNumber.capabilities,
      dateCreated: phoneNumber.dateCreated,
      dateUpdated: phoneNumber.dateUpdated
    };
    
    console.log(`[Twilio Regulatory] Phone number: ${details.phoneNumber}`);
    console.log(`[Twilio Regulatory] Bundle SID: ${details.bundleSid || 'Not assigned'}`);
    
    return details;
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to fetch phone number:', error);
    throw new Error(`Failed to fetch phone number details: ${error.message}`);
  }
}

/**
 * Find phone number SID by phone number string
 * Searches through all incoming phone numbers to find matching number
 * 
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +442896021156)
 * @returns {Promise<string>} Phone number SID
 * @throws {Error} If phone number not found
 */
export async function findPhoneNumberSid(phoneNumber) {
  try {
    console.log(`[Twilio Regulatory] Finding SID for phone number: ${phoneNumber}`);
    
    const client = initializeTwilioClient();
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    });
    
    if (phoneNumbers.length === 0) {
      throw new Error(`Phone number ${phoneNumber} not found in your Twilio account`);
    }
    
    const sid = phoneNumbers[0].sid;
    console.log(`[Twilio Regulatory] Found SID: ${sid}`);
    
    return sid;
  } catch (error) {
    console.error('[Twilio Regulatory] Failed to find phone number SID:', error);
    throw new Error(`Failed to find phone number SID: ${error.message}`);
  }
}

/**
 * Complete workflow: Assign approved UK bundle to a phone number
 * Automatically finds approved bundle and assigns it
 * 
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +442896021156)
 * @returns {Promise<Object>} Assignment result with details
 * @throws {Error} If no approved bundle found or assignment fails
 */
export async function assignApprovedBundleToNumber(phoneNumber) {
  try {
    console.log(`[Twilio Regulatory] Starting bundle assignment workflow for ${phoneNumber}...`);
    
    // Step 1: Find phone number SID
    const phoneNumberSid = await findPhoneNumberSid(phoneNumber);
    
    // Step 2: Find approved UK bundles
    const approvedBundles = await findApprovedUKBundles();
    
    if (approvedBundles.length === 0) {
      throw new Error(
        'No approved UK regulatory bundles found. ' +
        'Please create and get approval for a UK Local Business bundle first.'
      );
    }
    
    // Step 3: Use the first approved bundle
    const bundleToAssign = approvedBundles[0];
    console.log(`[Twilio Regulatory] Using bundle: ${bundleToAssign.friendlyName} (${bundleToAssign.sid})`);
    
    // Step 4: Assign bundle to phone number
    const result = await assignBundleToPhoneNumber(phoneNumberSid, bundleToAssign.sid);
    
    console.log('[Twilio Regulatory] Workflow completed successfully');
    
    return {
      success: true,
      phoneNumber: phoneNumber,
      phoneNumberSid: phoneNumberSid,
      bundleSid: bundleToAssign.sid,
      bundleName: bundleToAssign.friendlyName,
      message: 'Regulatory bundle assigned successfully'
    };
  } catch (error) {
    console.error('[Twilio Regulatory] Workflow failed:', error);
    throw error;
  }
}

