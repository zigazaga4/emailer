#!/bin/bash

# Zoho OAuth Token Generator for Self Client
CLIENT_ID="1000.LW4UDAYY1JRRXB0NANAUTMSTTDXGBN"
CLIENT_SECRET="1ba3eb51491b523c963afc0587dd9475712c667405"
SCOPE="ZohoMail.messages.CREATE,ZohoMail.accounts.READ"

echo "=========================================="
echo "Zoho OAuth Token Generator (Self Client)"
echo "=========================================="
echo ""
echo "Step 1: Go to Zoho API Console:"
echo "https://api-console.zoho.eu"
echo ""
echo "Step 2: Click on your Self Client"
echo ""
echo "Step 3: Click the 'Generate Code' button"
echo "  - Scope: ZohoMail.messages.CREATE,ZohoMail.accounts.READ"
echo "  - Time Duration: 3 minutes (or 10 minutes)"
echo ""
echo "Step 4: Copy the generated code and paste it below:"
echo ""
read -p "Enter the authorization code: " AUTH_CODE

echo ""
echo "Exchanging code for tokens..."
echo ""

# Exchange code for tokens (Self Client doesn't need redirect_uri)
RESPONSE=$(curl -s -X POST https://accounts.zoho.eu/oauth/v2/token \
  -d "code=${AUTH_CODE}" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "grant_type=authorization_code")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Extract refresh token
REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refresh_token' 2>/dev/null)
ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token' 2>/dev/null)

if [ "$REFRESH_TOKEN" != "null" ] && [ -n "$REFRESH_TOKEN" ]; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS! Here are your credentials:"
    echo "=========================================="
    echo ""
    echo "Refresh Token: $REFRESH_TOKEN"
    echo ""
    
    # Get Account ID
    echo "Getting Account ID..."
    ACCOUNT_RESPONSE=$(curl -s -X GET "https://mail.zoho.eu/api/accounts" \
      -H "Authorization: Zoho-oauthtoken ${ACCESS_TOKEN}")
    
    echo "Account Response:"
    echo "$ACCOUNT_RESPONSE" | jq '.' 2>/dev/null || echo "$ACCOUNT_RESPONSE"
    
    ACCOUNT_ID=$(echo "$ACCOUNT_RESPONSE" | jq -r '.data[0].accountId' 2>/dev/null)
    
    if [ "$ACCOUNT_ID" != "null" ] && [ -n "$ACCOUNT_ID" ]; then
        echo ""
        echo "=========================================="
        echo "✅ COMPLETE CREDENTIALS:"
        echo "=========================================="
        echo "Client ID: $CLIENT_ID"
        echo "Client Secret: $CLIENT_SECRET"
        echo "Refresh Token: $REFRESH_TOKEN"
        echo "Account ID: $ACCOUNT_ID"
        echo "=========================================="
    else
        echo ""
        echo "⚠️  Could not get Account ID automatically."
        echo "You can get it manually from Zoho Mail Admin Console."
    fi
else
    echo ""
    echo "❌ Error: Could not get refresh token."
    echo "Please check the authorization code and try again."
fi

