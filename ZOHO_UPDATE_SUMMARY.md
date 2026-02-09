# Zoho Email Configuration Update Summary

## Changes Made

### 1. Updated Zoho Credentials
**Old Account:** justhemis@justhemis.com / noreply@justhemis.com  
**New Account:** office@justhemis.com

**New Credentials:**
- Client ID: `1000.LW4UDAYY1JRRXB0NANAUTMSTTDXGBN`
- Client Secret: `1ba3eb51491b523c963afc0587dd9475712c667405`
- Refresh Token: `1000.cc22315386cd2d28efccf8692fbd876a.61144f5c943828e0b64f2abaf2db1afd`
- Account ID: `7827310000000002002`
- API Domain: `https://mail.zoho.eu`
- Auth Domain: `https://accounts.zoho.eu`

### 2. Added Email Alias Support
The app now supports sending from multiple office email addresses:
- ✅ office@justhemis.com (Main Office)
- ✅ uk@justhemis.com (UK Office)
- ✅ usa@justhemis.com (USA Office)
- ✅ canada@justhemis.com (Canada Office)
- ✅ australia@justhemis.com (Australia Office)

All aliases use the same Zoho account credentials but appear as different senders.

### 3. Updated Files

#### Backend (Electron Main Process)
1. **electron-svelte-app/electron/zoho-api.js**
   - Updated ZOHO_CONFIG with new credentials
   - Added EMAIL_ALIASES array
   - Modified `sendEmail()` to accept `fromAddress` parameter
   - Modified `sendEmailWithAttachments()` to accept `fromAddress` parameter
   - Exported EMAIL_ALIASES for UI use

2. **electron-svelte-app/electron/email-handler.js**
   - Updated to pass `zohoFromAddress` from settings to Zoho API
   - Defaults to 'office@justhemis.com' if not specified

#### Frontend (Renderer Process)
3. **electron-svelte-app/src/lib/services/zoho-auth.js**
   - Updated ZOHO_CONFIG with new credentials

4. **electron-svelte-app/src/lib/services/zoho-ipc.js**
   - Added `zohoFromAddress` to email settings retrieval

5. **electron-svelte-app/src/lib/components/modals/EmailSettingsModal.svelte**
   - Added `zohoEmailAliases` array with all office emails
   - Added `zohoFromAddress` to settings state
   - Added dropdown selector for choosing which office email to send from
   - Updated UI to show "Zoho Mail (Office Emails)" instead of specific email
   - Added info box showing all available aliases
   - Updated `saveSettings()` to save `zoho_from_address` to localStorage

#### Documentation
6. **electron-svelte-app/api-docs/zoho.md**
   - Updated with new credentials
   - Added section for email aliases
   - Added usage notes

### 4. How It Works

#### User Flow:
1. User opens **Email Settings** modal
2. Selects **"Zoho Mail (Office Emails)"** as provider
3. Chooses which office email to send from using the **"Send From"** dropdown
4. Clicks **"Save Settings"**
5. Selected email is stored in localStorage as `zoho_from_address`

#### Email Sending Flow:
1. User composes and sends an email
2. App retrieves `zoho_from_address` from localStorage
3. Email handler passes the selected address to Zoho API
4. Zoho API uses the selected address in the `fromAddress` field
5. Email is sent from the chosen office email alias

### 5. Storage Keys

The following localStorage keys are used:
- `email_provider` - 'zoho' or 'cpanel'
- `zoho_from_address` - Selected office email (defaults to 'office@justhemis.com')
- `cpanel_host` - cPanel SMTP host
- `cpanel_port` - cPanel SMTP port
- `cpanel_secure` - cPanel SSL/TLS setting
- `cpanel_user` - cPanel email address
- `cpanel_pass` - cPanel email password

### 6. Testing Checklist

- [ ] Open the app
- [ ] Go to Email Settings
- [ ] Verify all 5 office emails appear in the dropdown
- [ ] Select different office emails and save
- [ ] Send a test email from each office email
- [ ] Verify the "From" address in received emails matches the selected alias
- [ ] Test with attachments
- [ ] Test with CC/BCC
- [ ] Verify emails are sent successfully

### 7. Important Notes

1. **All aliases share the same inbox** - All emails sent from any alias will appear in the office@justhemis.com inbox
2. **No separate OAuth tokens needed** - All aliases use the same OAuth credentials
3. **Backward compatible** - If no alias is selected, defaults to office@justhemis.com
4. **Works with both providers** - Zoho alias selection only appears when Zoho is selected as provider

### 8. Troubleshooting

**If emails fail to send:**
1. Check that the refresh token is valid
2. Verify the account ID is correct
3. Ensure the selected alias exists in Zoho Mail
4. Check browser console for error messages

**If wrong "From" address appears:**
1. Open Email Settings
2. Verify the correct office email is selected
3. Click "Save Settings"
4. Try sending again

### 9. Future Enhancements

Potential improvements:
- Add display name customization for each alias
- Add signature support per alias
- Add reply-to address configuration
- Add email tracking/analytics per alias
- Add alias-specific templates

---

## Quick Start

1. **Open the app**
2. **Click the settings icon** (gear icon in the UI)
3. **Select "Zoho Mail (Office Emails)"** as provider
4. **Choose your preferred office email** from the dropdown
5. **Click "Save Settings"**
6. **Start sending emails!**

All emails will now be sent from your selected office email address.

