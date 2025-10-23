/**
 * Twilio WhatsApp API Usage Examples
 * 
 * This file contains example code demonstrating how to use the Twilio WhatsApp API
 * These examples can be used as reference when implementing frontend features
 * 
 * NOTE: These are examples only. Do not run this file directly.
 * Copy the relevant code into your components as needed.
 */

// ============================================================================
// EXAMPLE 1: Initialize and Send a Simple Text Message
// ============================================================================

async function example1_sendSimpleMessage() {
  // Import the service
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    // Initialize the service (loads configuration)
    await twilioWhatsAppService.initialize();
    console.log('Service initialized');
    
    // Send a simple text message
    const result = await twilioWhatsAppService.sendTextMessage(
      '+15551234567',  // Recipient phone number (E.164 format)
      'Hello! This is a test message from Twilio WhatsApp API.',  // Message body
      '+15559876543'   // Sender phone number (optional if default is configured)
    );
    
    console.log('Message sent successfully!');
    console.log('Message SID:', result.sid);
    console.log('Status:', result.status);
    console.log('To:', result.to);
    console.log('From:', result.from);
    
    return result;
  } catch (error) {
    console.error('Failed to send message:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Send a Message with Media (Image)
// ============================================================================

async function example2_sendMessageWithImage() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // Send a message with an image
    const result = await twilioWhatsAppService.sendMessageWithMedia(
      '+15551234567',  // Recipient
      'Check out this image!',  // Message body
      ['https://demo.twilio.com/owl.png'],  // Array of media URLs
      '+15559876543'   // Sender (optional)
    );
    
    console.log('Message with media sent!');
    console.log('Message SID:', result.sid);
    console.log('Number of media:', result.numMedia);
    
    return result;
  } catch (error) {
    console.error('Failed to send message with media:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Send Message with Status Callback
// ============================================================================

async function example3_sendMessageWithCallback() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // Send message with status callback URL
    const result = await twilioWhatsAppService.sendMessage({
      to: '+15551234567',
      from: '+15559876543',
      body: 'Message with status tracking',
      statusCallback: 'https://your-server.com/webhook/status'  // Your webhook URL
    });
    
    console.log('Message sent with status callback');
    console.log('Message SID:', result.sid);
    
    return result;
  } catch (error) {
    console.error('Failed to send message:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Fetch Message Status
// ============================================================================

async function example4_fetchMessageStatus(messageSid) {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // Fetch message details by SID
    const message = await twilioWhatsAppService.fetchMessage(messageSid);
    
    console.log('Message Details:');
    console.log('SID:', message.sid);
    console.log('Status:', message.status);
    console.log('To:', message.to);
    console.log('From:', message.from);
    console.log('Body:', message.body);
    console.log('Date Created:', message.dateCreated);
    console.log('Date Sent:', message.dateSent);
    console.log('Price:', message.price, message.priceUnit);
    
    if (message.errorCode) {
      console.log('Error Code:', message.errorCode);
      console.log('Error Message:', message.errorMessage);
    }
    
    return message;
  } catch (error) {
    console.error('Failed to fetch message:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: List Recent Messages
// ============================================================================

async function example5_listRecentMessages() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // List recent messages
    const messages = await twilioWhatsAppService.listMessages({
      limit: 20  // Get last 20 messages
    });
    
    console.log(`Found ${messages.length} messages`);
    
    messages.forEach((msg, index) => {
      console.log(`\nMessage ${index + 1}:`);
      console.log('  SID:', msg.sid);
      console.log('  To:', msg.to);
      console.log('  From:', msg.from);
      console.log('  Status:', msg.status);
      console.log('  Body:', msg.body.substring(0, 50) + '...');
      console.log('  Date:', msg.dateCreated);
    });
    
    return messages;
  } catch (error) {
    console.error('Failed to list messages:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: List Messages with Filters
// ============================================================================

async function example6_listFilteredMessages() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // List messages with filters
    const messages = await twilioWhatsAppService.listMessages({
      from: '+15559876543',  // Filter by sender
      to: '+15551234567',    // Filter by recipient
      limit: 10              // Limit results
    });
    
    console.log(`Found ${messages.length} filtered messages`);
    
    return messages;
  } catch (error) {
    console.error('Failed to list filtered messages:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: Set Default Sender Number
// ============================================================================

async function example7_setDefaultSender() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // Set default WhatsApp sender number
    await twilioWhatsAppService.setDefaultSender('+15559876543');
    
    console.log('Default sender number set successfully');
    
    // Now you can send messages without specifying 'from'
    const result = await twilioWhatsAppService.sendTextMessage(
      '+15551234567',
      'Message sent using default sender'
      // No 'from' parameter needed
    );
    
    console.log('Message sent using default sender');
    
    return result;
  } catch (error) {
    console.error('Failed to set default sender:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 8: Phone Number Validation and Formatting
// ============================================================================

async function example8_phoneNumberValidation() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  const testNumbers = [
    '+15551234567',      // Valid E.164
    '15551234567',       // Missing +
    '+1 555 123 4567',   // Has spaces
    '(555) 123-4567',    // US format
    'invalid'            // Invalid
  ];
  
  console.log('Phone Number Validation:');
  
  testNumbers.forEach(number => {
    const formatted = twilioWhatsAppService.formatPhoneNumber(number);
    const isValid = twilioWhatsAppService.validatePhoneNumber(number);
    const whatsappFormat = twilioWhatsAppService.formatWhatsAppNumber(number);
    
    console.log(`\nOriginal: ${number}`);
    console.log(`Formatted: ${formatted}`);
    console.log(`Valid: ${isValid}`);
    console.log(`WhatsApp Format: ${whatsappFormat}`);
  });
}

// ============================================================================
// EXAMPLE 9: Using IPC Layer Directly
// ============================================================================

async function example9_useIPCDirectly() {
  const { sendWhatsAppMessage } = await import('../src/lib/twilio-ipc.js');
  
  try {
    // Send message using IPC layer directly (lower level)
    const result = await sendWhatsAppMessage({
      to: '+15551234567',
      from: '+15559876543',
      body: 'Message sent via IPC layer'
    });
    
    console.log('Message sent via IPC:', result.sid);
    
    return result;
  } catch (error) {
    console.error('Failed to send via IPC:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 10: Bulk Send Messages to Multiple Recipients
// ============================================================================

async function example10_bulkSendMessages() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    const recipients = [
      '+15551111111',
      '+15552222222',
      '+15553333333'
    ];
    
    const messageBody = 'Bulk message sent to multiple recipients';
    const results = [];
    
    console.log(`Sending messages to ${recipients.length} recipients...`);
    
    for (const recipient of recipients) {
      try {
        const result = await twilioWhatsAppService.sendTextMessage(
          recipient,
          messageBody
        );
        
        console.log(`✓ Sent to ${recipient}: ${result.sid}`);
        results.push({ recipient, success: true, sid: result.sid });
        
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`✗ Failed to send to ${recipient}:`, error.message);
        results.push({ recipient, success: false, error: error.message });
      }
    }
    
    console.log('\nBulk send complete:');
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    
    return results;
  } catch (error) {
    console.error('Bulk send failed:', error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 11: Get and Update Configuration
// ============================================================================

async function example11_manageConfiguration() {
  const twilioWhatsAppService = (await import('../src/lib/twilio-whatsapp.js')).default;
  
  try {
    await twilioWhatsAppService.initialize();
    
    // Get current configuration
    const config = await twilioWhatsAppService.getConfig();
    console.log('Current Configuration:');
    console.log('Account SID:', config.accountSid);
    console.log('WhatsApp From:', config.whatsappFrom);
    console.log('Has Auth Token:', config.hasAuthToken);
    
    // Update configuration (if needed)
    // await twilioWhatsAppService.updateConfig({
    //   whatsappFrom: '+15559876543'
    // });
    
    return config;
  } catch (error) {
    console.error('Failed to manage configuration:', error.message);
    throw error;
  }
}

// ============================================================================
// Export examples for reference
// ============================================================================

export {
  example1_sendSimpleMessage,
  example2_sendMessageWithImage,
  example3_sendMessageWithCallback,
  example4_fetchMessageStatus,
  example5_listRecentMessages,
  example6_listFilteredMessages,
  example7_setDefaultSender,
  example8_phoneNumberValidation,
  example9_useIPCDirectly,
  example10_bulkSendMessages,
  example11_manageConfiguration
};

