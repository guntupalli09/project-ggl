import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5176'],
  credentials: true
}));
app.use(express.json());

// Store state for CSRF protection (in production, use Redis or database)
const stateStore = new Map();

// LinkedIn OAuth configuration
const LINKEDIN_CONFIG = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5173/linkedin/callback',
  scope: 'openid profile email w_member_social'
};

// Generate LinkedIn OAuth URL
app.get('/api/linkedin/auth', (req, res) => {
  try {
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    stateStore.set(state, {
      timestamp: Date.now(),
      userId: req.query.userId || 'anonymous'
    });

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of stateStore.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        stateStore.delete(key);
      }
    }

    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LINKEDIN_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', LINKEDIN_CONFIG.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', LINKEDIN_CONFIG.scope);

    res.json({
      success: true,
      authUrl: authUrl.toString(),
      state: state
    });
  } catch (error) {
    console.error('Error generating LinkedIn auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

// Exchange authorization code for access token
app.post('/api/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state parameter'
      });
    }

    // Verify state for CSRF protection
    if (!stateStore.has(state)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
    }

    // Remove used state
    stateStore.delete(state);

    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: LINKEDIN_CONFIG.redirectUri,
      client_id: LINKEDIN_CONFIG.clientId,
      client_secret: LINKEDIN_CONFIG.clientSecret
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, expires_in } = tokenResponse.data;

    // Get user profile using OpenID Connect userinfo endpoint
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    res.json({
      success: true,
      access_token: access_token,
      expires_in: expires_in,
      profile: {
        id: profileResponse.data.sub,
        firstName: profileResponse.data.given_name || '',
        lastName: profileResponse.data.family_name || '',
        profilePicture: profileResponse.data.picture || null,
        email: profileResponse.data.email || null
      }
    });

  } catch (error) {
    console.error('Error in LinkedIn callback:', error);
    
    if (error.response) {
      console.error('LinkedIn API Error Status:', error.response.status);
      console.error('LinkedIn API Error Data:', error.response.data);
      return res.status(400).json({
        success: false,
        error: 'LinkedIn API error: ' + (error.response.data.error_description || error.response.data.error || 'Unknown error')
      });
    }

    console.error('Non-API Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// Test endpoint to verify LinkedIn connection
app.get('/api/linkedin/test/:accessToken', async (req, res) => {
  try {
    const { accessToken } = req.params;

    // Get user profile using OpenID Connect userinfo endpoint
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({
      success: true,
      profile: {
        id: profileResponse.data.sub,
        firstName: profileResponse.data.given_name || '',
        lastName: profileResponse.data.family_name || '',
        profilePicture: profileResponse.data.picture || null,
        email: profileResponse.data.email || null
      }
    });

  } catch (error) {
    console.error('Error testing LinkedIn connection:', error);
    res.status(400).json({
      success: false,
      error: error.response?.data?.error_description || error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📋 LinkedIn Client ID: ${LINKEDIN_CONFIG.clientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`🔐 LinkedIn Client Secret: ${LINKEDIN_CONFIG.clientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`🔗 Redirect URI: ${LINKEDIN_CONFIG.redirectUri}`);
});
