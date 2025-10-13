# LinkedIn OAuth Configuration Check

## Current Configuration
- **Client ID**: `86ts0ompt7atve`
- **Redirect URI**: `http://localhost:5173/linkedin/callback`
- **Scopes**: `openid profile email w_member_social`

## LinkedIn Developer Console Checklist

### 1. Go to LinkedIn Developer Console
- Visit: https://www.linkedin.com/developers/apps
- Find your app with Client ID: `86ts0ompt7atve`

### 2. Check "Auth" Tab
- **Redirect URLs** section should contain:
  ```
  http://localhost:5173/linkedin/callback
  ```
- **Important**: This must be in "Redirect URLs", NOT "Authorized JavaScript Origins"
- **No trailing slash** - exactly as shown above
- **Case sensitive** - must be lowercase
- **No extra spaces** or characters

### 3. Check "Products" Tab
- Make sure these are enabled:
  - ✅ **Sign In with LinkedIn using OpenID Connect**
  - ✅ **Share on LinkedIn**

### 4. Common Issues
- Redirect URI mismatch (most common cause of "invalid_request")
- Wrong client ID/secret
- Missing products enabled
- Case sensitivity issues
- Extra characters or spaces

## Test Steps
1. Update LinkedIn Developer Console with exact redirect URI above
2. Save changes in LinkedIn Developer Console
3. Go to: http://localhost:5173/linkedin-debug
4. Click "Clear LinkedIn Data"
5. Click "Open LinkedIn OAuth"
6. Complete authorization
7. Check browser console for debug messages
8. Check if profile data is saved to database

## Expected Result
After successful OAuth, you should see:
- Your actual LinkedIn name (e.g., "Santhosh G")
- Your LinkedIn profile picture
- Console messages showing profile data being saved
- Data in the social_accounts table
