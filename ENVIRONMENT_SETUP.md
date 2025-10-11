# Environment Setup Guide

This guide explains how to set up the Google Calendar integration for both development and production environments.

## Development Environment

### Required Environment Variables

Create a `.env` file in the project root with:

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (optional)
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID
5. Configure the following:

**Authorised JavaScript origins:**
- `http://localhost:5173`

**Authorised redirect URIs:**
- `http://localhost:5173/profile`

## Production Environment

### Required Environment Variables

Set these in your Vercel dashboard or hosting platform:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key
```

### Google Cloud Console Setup

**Authorised JavaScript origins:**
- `https://www.getgetleads.com`
- `https://getgetleads.com`

**Authorised redirect URIs:**
- `https://www.getgetleads.com/api/google/callback`

## How It Works

### Development Mode
- Uses direct Google OAuth API calls from the frontend
- Requires `VITE_GOOGLE_CLIENT_SECRET` in `.env`
- Redirects to `/profile` after OAuth

### Production Mode
- Uses secure backend API endpoints (`/api/google/exchange-token`, `/api/google/refresh-token`)
- Client secret is kept secure on the server
- Redirects to `/api/google/callback` after OAuth

### Environment Detection

The app automatically detects the environment based on:
1. `import.meta.env.MODE` (Vite build mode)
2. `window.location.hostname` (current domain)

## API Endpoints (Production Only)

### `/api/google/exchange-token`
- Exchanges OAuth code for access/refresh tokens
- Used in production to keep client secret secure

### `/api/google/refresh-token`
- Refreshes expired access tokens
- Used in production for automatic token renewal

## Troubleshooting

### Common Issues

1. **"Google Client ID not configured"**
   - Check that `VITE_GOOGLE_CLIENT_ID` is set in `.env`
   - Restart the development server after adding environment variables

2. **"redirect_uri_mismatch"**
   - Ensure the redirect URI in Google Cloud Console matches exactly
   - Check both development and production URIs are configured

3. **"Invalid client secret"**
   - Verify `VITE_GOOGLE_CLIENT_SECRET` is correct for development
   - Check `GOOGLE_CLIENT_SECRET` is set in production environment

4. **401 Unauthorized errors**
   - The app automatically refreshes expired tokens
   - Check that refresh tokens are being saved properly

### Debug Mode

The app logs detailed information about:
- Environment detection
- OAuth flow steps
- Token refresh attempts
- API call results

Check the browser console for debugging information.

## Security Notes

- Never commit `.env` files to version control
- Use different OAuth credentials for development and production
- Keep client secrets secure in production
- Regularly rotate OAuth credentials
