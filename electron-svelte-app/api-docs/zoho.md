# Zoho Email Configuration

## ⚠️ IMPORTANT: Now Using SMTP Instead of API

**The app has been switched from Zoho Mail API to Zoho SMTP to support custom display names.**

See [ZOHO_SMTP_SETUP.md](../../ZOHO_SMTP_SETUP.md) for complete setup instructions.

---

## Current Configuration: Zoho SMTP

### SMTP Settings
- **SMTP Server:** smtp.zoho.eu
- **Port:** 465 (SSL) or 587 (TLS)
- **Username:** office@justhemis.com
- **Password:** Your Zoho password or app-specific password (recommended)
- **Security:** SSL/TLS enabled

### Available Email Aliases with Display Names

All aliases use the same SMTP credentials (office@justhemis.com) but send with different display names:

- office@justhemis.com → "Justhemis Office"
- uk@justhemis.com → "Justhemis UK"
- usa@justhemis.com → "Justhemis USA"
- canada@justhemis.com → "Justhemis Canada"
- australia@justhemis.com → "Justhemis Australia"

### Notes

- All emails are sent using SMTP with the office@justhemis.com credentials
- The "From" header includes both display name and email address
- Recipients see the custom display name (e.g., "Justhemis UK") instead of just the email prefix
- All aliases share the same inbox (office@justhemis.com)

---

## Legacy: Zoho Mail API Credentials (DEPRECATED)

**⚠️ These API credentials are no longer used by the app but kept for reference.**

### OAuth Credentials
- Client ID: 1000.LW4UDAYY1JRRXB0NANAUTMSTTDXGBN
- Client Secret: 1ba3eb51491b523c963afc0587dd9475712c667405
- Refresh Token: 1000.cc22315386cd2d28efccf8692fbd876a.61144f5c943828e0b64f2abaf2db1afd
- Account ID: 7827310000000002002
- API Domain: https://mail.zoho.eu (EU server)
- Auth Domain: https://accounts.zoho.eu (EU server)

### Why We Switched from API to SMTP

The Zoho Mail API does not support custom display names. When sending via API:
- ❌ Display names configured in Zoho Mail settings are ignored
- ❌ Emails show only the email prefix (e.g., "uk" instead of "Justhemis UK")
- ❌ No way to customize how sender name appears to recipients

By switching to SMTP:
- ✅ Full control over display names via the "From" header
- ✅ Professional sender names in recipients' inboxes
- ✅ Same functionality with better presentation