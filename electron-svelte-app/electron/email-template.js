/**
 * Email Template Module - Justhemis branded email wrapper
 * Wraps all outgoing emails with consistent branding and styling
 */

/**
 * Default slogan color (turquoise)
 */
const DEFAULT_SLOGAN_COLOR = '#40E0D0';

/**
 * Base HTML email template with Justhemis branding
 * Placeholders:
 * - {title} - Email title displayed in header
 * - {body_content} - Main email body content
 * - {code_block} - Optional code/verification block (replaced with empty string if not provided)
 * - {slogan_color} - Color for the slogan text (defaults to turquoise)
 */
const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td style="padding: 40px;">
                <!-- Logo Header -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="left" width="140" valign="middle">
                            <img src="https://justhemis.com/logo.png" alt="Justhemis" width="100" style="display: block; border: 0;">
                        </td>
                        <td align="right" valign="middle" style="padding-left: 20px;">
                            <p style="margin: 0; font-size: 22px; color: {slogan_color}; font-family: 'Great Vibes', cursive; text-align: right;">Your intelligent legal portal<br>built for modern law</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Divider -->
        <tr>
            <td style="padding: 0 40px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="border-top: 1px solid #e0e0e0;"></td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Body Content -->
        <tr>
            <td style="padding: 30px 40px; font-size: 15px; line-height: 1.6; color: #333333;">
                {body_content}
            </td>
        </tr>

        {code_block}

        <!-- Footer Divider -->
        <tr>
            <td style="padding: 0 40px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="border-top: 1px solid #e0e0e0;"></td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td align="center" style="padding: 30px 40px;">
                <p style="margin: 0; font-size: 14px;">
                    <a href="https://justhemis.com" style="color: #1B365D; text-decoration: underline; font-weight: 500;">Check out our website</a>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>`;

/**
 * Code block template for verification codes or similar
 */
const CODE_BLOCK_TEMPLATE = `<!-- Code Block -->
<tr>
    <td align="center" style="padding: 30px 40px;">
        <table border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="background-color: #1B365D; padding: 20px 30px; border-radius: 8px;">
                    <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 8px;">{code}</span>
                </td>
            </tr>
        </table>
    </td>
</tr>`;

/**
 * Inline styles for heading elements in emails
 * Email clients require inline styles for proper rendering
 */
const HEADING_STYLES = {
  h1: 'margin: 16px 0 12px 0; font-size: 28px; font-weight: 700; color: #1B365D; line-height: 1.3;',
  h2: 'margin: 14px 0 10px 0; font-size: 24px; font-weight: 600; color: #1B365D; line-height: 1.3;',
  h3: 'margin: 12px 0 8px 0; font-size: 20px; font-weight: 600; color: #1B365D; line-height: 1.4;',
  h4: 'margin: 10px 0 6px 0; font-size: 16px; font-weight: 600; color: #1B365D; line-height: 1.4;'
};

/**
 * Inline styles for list elements in emails
 */
const LIST_STYLES = {
  ul: 'margin: 12px 0; padding-left: 24px; color: #333333;',
  ol: 'margin: 12px 0; padding-left: 24px; color: #333333;',
  li: 'margin: 6px 0; line-height: 1.5;'
};

/**
 * Add inline styles to HTML elements for email compatibility
 * Processes headings, lists, and other elements
 * @param {string} html - HTML content
 * @returns {string} HTML with inline styles
 */
function addInlineStyles(html) {
  let styledHtml = html;

  // Add inline styles to headings
  for (const [tag, style] of Object.entries(HEADING_STYLES)) {
    const regex = new RegExp(`<${tag}([^>]*)>`, 'gi');
    styledHtml = styledHtml.replace(regex, (match, attributes) => {
      if (attributes.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1 ${style}"`);
      }
      return `<${tag} style="${style}"${attributes}>`;
    });
  }

  // Add inline styles to lists
  for (const [tag, style] of Object.entries(LIST_STYLES)) {
    const regex = new RegExp(`<${tag}([^>]*)>`, 'gi');
    styledHtml = styledHtml.replace(regex, (match, attributes) => {
      if (attributes.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1 ${style}"`);
      }
      return `<${tag} style="${style}"${attributes}>`;
    });
  }

  return styledHtml;
}

/**
 * Wrap email content with Justhemis branded template
 * @param {Object} options - Template options
 * @param {string} options.title - Email title (displayed in header)
 * @param {string} options.bodyContent - Main email body HTML content
 * @param {string} [options.code] - Optional verification/confirmation code
 * @param {string} [options.sloganColor] - Optional color for the slogan text (defaults to turquoise)
 * @returns {string} Complete HTML email with branding
 */
export function wrapWithTemplate({ title, bodyContent, code, sloganColor }) {
  // Build code block if code is provided
  let codeBlock = '';
  if (code && code.trim()) {
    codeBlock = CODE_BLOCK_TEMPLATE.replace('{code}', code);
  }

  // Use provided slogan color or default
  const finalSloganColor = sloganColor || DEFAULT_SLOGAN_COLOR;

  // Add inline styles to headings, lists, etc. for email compatibility
  const styledBodyContent = addInlineStyles(bodyContent);

  // Build final email HTML
  const emailHtml = EMAIL_TEMPLATE
    .replace(/{title}/g, title)
    .replace('{body_content}', styledBodyContent)
    .replace('{code_block}', codeBlock)
    .replace('{slogan_color}', finalSloganColor);

  return emailHtml;
}

/**
 * Check if HTML content is already wrapped with our template
 * @param {string} html - HTML content to check
 * @returns {boolean} True if already wrapped
 */
export function isAlreadyWrapped(html) {
  // Check for our template markers
  return html.includes('https://justhemis.com/logo.png') &&
         html.includes('Your intelligent legal portal');
}

export default {
  wrapWithTemplate,
  isAlreadyWrapped
};
