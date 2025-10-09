# LinkedIn OAuth Setup Guide

## ✅ Fixed Issues

1. **Removed deprecated `r_emailaddress` scope** - LinkedIn no longer supports this scope
2. **Updated to correct scopes**: `r_liteprofile w_member_social`
3. **Created secure backend** - Client secret is now properly protected
4. **Fixed redirect URI handling** - Proper state management for CSRF protection

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env file with your LinkedIn credentials
# LINKEDIN_CLIENT_ID=86ts00mpt7atve
# LINKEDIN_CLIENT_SECRET=your_actual_secret_here
# LINKEDIN_REDIRECT_URI=http://localhost:5173/oauth/linkedin/callback

# Start the backend server
npm run dev
```

### 2. Frontend Setup

```bash
# In the main project directory
npm run dev
```

### 3. LinkedIn Developer App Configuration

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Select your "getgetleads" app
3. Go to "Auth" tab
4. In "OAuth 2.0 settings", update:
   - **Authorized redirect URLs**: `http://localhost:5173/oauth/linkedin/callback`
   - **Scopes**: `r_liteprofile` and `w_member_social`
5. Click "Update" to save

## 🔧 Environment Variables

### Backend (.env)
```env
LINKEDIN_CLIENT_ID=86ts00mpt7atve
LINKEDIN_CLIENT_SECRET=your_actual_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:5173/oauth/linkedin/callback
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_LINKEDIN_CLIENT_ID=86ts00mpt7atve
# Note: Client secret should NOT be in frontend .env
```

## 🧪 Testing the OAuth Flow

### Method 1: Using the Test Page
1. Start both backend and frontend servers
2. Navigate to `/linkedin-oauth-test` in your browser
3. Click "Generate OAuth URL"
4. Complete LinkedIn authorization
5. Test the access token

### Method 2: Manual Testing
1. Visit: `http://localhost:3001/api/linkedin/auth`
2. Copy the `authUrl` from the response
3. Open the URL in your browser
4. Complete LinkedIn authorization
5. Use the returned code to test token exchange

## 📋 Verification Checklist

### ✅ Backend Server
- [ ] Backend server running on port 3001
- [ ] Environment variables properly set
- [ ] Health check endpoint working: `http://localhost:3001/api/health`
- [ ] LinkedIn auth endpoint working: `http://localhost:3001/api/linkedin/auth`

### ✅ LinkedIn App Configuration
- [ ] Redirect URI matches exactly: `http://localhost:5173/oauth/linkedin/callback`
- [ ] Scopes are correct: `r_liteprofile w_member_social`
- [ ] App is in "Live" status (not "Development")
- [ ] Client ID matches: `86ts00mpt7atve`

### ✅ OAuth Flow
- [ ] Can generate OAuth URL without errors
- [ ] LinkedIn authorization page loads correctly
- [ ] User can grant permissions
- [ ] Callback receives authorization code
- [ ] Token exchange succeeds
- [ ] Can fetch user profile data
- [ ] Can fetch user email (if available)

### ✅ Security
- [ ] Client secret is only in backend environment
- [ ] State parameter is properly validated
- [ ] CORS is configured correctly
- [ ] No sensitive data exposed in frontend

## 🔍 Troubleshooting

### Common Issues

1. **"Scope r_emailaddress is not authorized"**
   - ✅ **FIXED**: Removed deprecated scope, using `r_liteprofile w_member_social`

2. **"Invalid redirect URI"**
   - Check that redirect URI in LinkedIn app matches exactly: `http://localhost:5173/oauth/linkedin/callback`
   - Ensure no trailing slashes or different protocols

3. **"Backend connection failed"**
   - Ensure backend server is running on port 3001
   - Check CORS configuration
   - Verify environment variables are set

4. **"Invalid state parameter"**
   - This is normal - state expires after 10 minutes
   - Generate a new OAuth URL if state is invalid

5. **"Could not fetch email"**
   - This is expected - LinkedIn's email API has restrictions
   - The profile data will still work without email

## 📊 API Endpoints

### Backend Endpoints

- `GET /api/health` - Health check
- `GET /api/linkedin/auth` - Generate OAuth URL
- `POST /api/linkedin/callback` - Exchange code for token
- `GET /api/linkedin/test/:accessToken` - Test access token

### Example Usage

```javascript
// Generate OAuth URL
const response = await fetch('http://localhost:3001/api/linkedin/auth')
const { authUrl, state } = await response.json()

// Exchange code for token
const tokenResponse = await fetch('http://localhost:3001/api/linkedin/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, state })
})
const { access_token, profile } = await tokenResponse.json()

// Test access token
const testResponse = await fetch(`http://localhost:3001/api/linkedin/test/${access_token}`)
const profileData = await testResponse.json()
```

## 🚨 Important Notes

1. **LinkedIn Compliance**: This implementation follows LinkedIn's OAuth 2.0 standards and is not headless automation
2. **User Consent**: Users must explicitly authorize your app through LinkedIn's interface
3. **Token Expiration**: Access tokens expire after 60 days and need to be refreshed
4. **Rate Limits**: LinkedIn has API rate limits - respect them in production
5. **Production**: For production, use HTTPS and update redirect URIs accordingly

## 🎯 Next Steps

1. Test the complete OAuth flow
2. Implement token refresh logic
3. Add error handling for production
4. Set up proper logging
5. Deploy backend to a secure server
6. Update redirect URIs for production domain

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check the backend server logs
3. Verify all environment variables are set
4. Ensure LinkedIn app configuration is correct
5. Test with the provided test endpoints
