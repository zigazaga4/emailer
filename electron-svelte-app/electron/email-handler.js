/**
 * Email Handler - Routes emails to the correct provider based on settings
 * Supports both Zoho Mail API and cPanel SMTP
 */

import { sendEmail as sendViaZoho } from './zoho-api.js';
import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Extract inline images from HTML and convert to CID attachments
 * @param {string} html - HTML content with base64 images
 * @returns {Object} { html: string, attachments: Array }
 */
function extractInlineImages(html) {
  const attachments = [];
  let imageCounter = 0;
  
  // Match base64 image data URLs
  const base64ImageRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/gi;
  
  const processedHtml = html.replace(base64ImageRegex, (match, imageType, base64Data) => {
    imageCounter++;
    const cid = `image${imageCounter}@emailer`;
    
    // Store the inline image as attachment
    attachments.push({
      filename: `image${imageCounter}.${imageType}`,
      content: base64Data,
      encoding: 'base64',
      cid: cid
    });
    
    // Replace base64 src with cid reference
    return match.replace(`data:image/${imageType};base64,${base64Data}`, `cid:${cid}`);
  });
  
  return {
    html: processedHtml,
    attachments
  };
}

/**
 * Send email via cPanel SMTP using Nodemailer
 * @param {Object} emailData - Email data
 * @param {Object} cpanelConfig - cPanel SMTP configuration
 * @returns {Promise<Object>} Result
 */
async function sendViaCPanel(emailData, cpanelConfig) {
  try {
    logger.info('email', 'Sending email via cPanel SMTP', {
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: emailData.attachments?.length > 0
    });

    // Extract inline images from HTML
    const { html: processedHtml, attachments: inlineImageAttachments } = extractInlineImages(emailData.body);
    
    // Create SMTP configuration
    const smtpConfig = {
      host: cpanelConfig.host,
      port: parseInt(cpanelConfig.port),
      secure: cpanelConfig.secure,
      auth: {
        user: cpanelConfig.user,
        pass: cpanelConfig.pass
      }
    };
    
    // Create transporter
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Prepare attachments array
    const allAttachments = [...inlineImageAttachments];
    
    // Add regular file attachments if any
    if (emailData.attachments && emailData.attachments.length > 0) {
      emailData.attachments.forEach(file => {
        allAttachments.push({
          filename: file.name,
          content: Buffer.from(file.data, 'base64'),
          contentType: file.type
        });
      });
    }
    
    // Prepare email options
    const mailOptions = {
      from: cpanelConfig.user,
      to: emailData.to,
      subject: emailData.subject,
      html: processedHtml,
      attachments: allAttachments
    };
    
    // Add CC if provided
    if (emailData.cc && emailData.cc.trim()) {
      mailOptions.cc = emailData.cc.trim();
    }
    
    // Add BCC if provided
    if (emailData.bcc && emailData.bcc.trim()) {
      mailOptions.bcc = emailData.bcc.trim();
    }
    
    logger.debug('email', 'Email prepared for sending', {
      inlineImages: inlineImageAttachments.length,
      fileAttachments: emailData.attachments?.length || 0
    });

    // Send email
    const info = await transporter.sendMail(mailOptions);

    logger.info('email', 'Email sent successfully via cPanel', {
      to: emailData.to,
      messageId: info.messageId
    });

    return {
      success: true,
      data: {
        messageId: info.messageId,
        response: info.response
      }
    };

  } catch (error) {
    logger.error('email', 'Failed to send email via cPanel SMTP', {
      to: emailData.to,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Main email sending function that routes to the correct provider
 * @param {Object} emailData - Email data
 * @param {Object} settings - Email provider settings from localStorage
 * @returns {Promise<Object>} Result
 */
export async function sendEmail(emailData, settings) {
  const provider = settings?.provider || 'zoho';
  
  console.log('[Main] Email provider:', provider);
  
  if (provider === 'cpanel') {
    // Validate cPanel configuration
    if (!settings.cpanel || !settings.cpanel.host || !settings.cpanel.user || !settings.cpanel.pass) {
      throw new Error('cPanel SMTP configuration is incomplete. Please configure it in Email Settings.');
    }
    
    return await sendViaCPanel(emailData, settings.cpanel);
  } else {
    // Use Zoho Mail API (default)
    return await sendViaZoho(emailData);
  }
}

