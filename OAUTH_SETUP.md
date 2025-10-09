# OAuth Setup Guide for Social Media Platforms

This guide will help you set up OAuth integration for LinkedIn, Facebook, and Instagram in your GGL application.

## Prerequisites

1. Developer accounts for each platform
2. Supabase project with social media tables created
3. Environment variables configured

## 1. LinkedIn OAuth Setup

### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in app details:
   - App name: "GGL Social Media Manager"
   - LinkedIn Page: Select your company page
   - App logo: Upload your app logo
   - Legal agreement: Accept terms

### Step 2: Configure OAuth Settings
1. In your app settings, go to "Auth" tab
2. Add redirect URL: `http://localhost:5173/oauth/linkedin/callback` (development)
3. Add redirect URL: `https://yourdomain.com/oauth/linkedin/callback` (production)
4. Request these scopes:
   - `r_liteprofile` - Read basic profile
   - `r_emailaddress` - Read email address
   - `w_member_social` - Post content

### Step 3: Get Credentials
1. Copy your Client ID and Client Secret
2. Add to your `.env` file:
   ```
   VITE_LINKEDIN_CLIENT_ID=your_client_id_here
   VITE_LINKEDIN_CLIENT_SECRET=your_client_secret_here
   ```

## 2. Facebook OAuth Setup

### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Select "Business" as app type
4. Fill in app details:
   - App name: "GGL Social Media Manager"
   - App contact email: Your email
   - App purpose: Select appropriate purpose

### Step 2: Configure OAuth Settings
1. In your app dashboard, go to "Facebook Login" > "Settings"
2. Add valid OAuth redirect URIs:
   - `http://localhost:5173/oauth/facebook/callback` (development)
   - `https://yourdomain.com/oauth/facebook/callback` (production)
3. Request these permissions:
   - `pages_manage_posts` - Manage posts on pages
   - `pages_read_engagement` - Read page insights
   - `publish_to_groups` - Publish to groups

### Step 3: Get Credentials
1. Go to "Settings" > "Basic"
2. Copy your App ID and App Secret
3. Add to your `.env` file:
   ```
   VITE_FACEBOOK_APP_ID=your_app_id_here
   VITE_FACEBOOK_APP_SECRET=your_app_secret_here
   ```

## 3. Instagram OAuth Setup

### Step 1: Create Instagram App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing Facebook app
3. Add Instagram Basic Display product
4. Configure Instagram Basic Display:
   - Valid OAuth Redirect URIs:
     - `http://localhost:5173/oauth/instagram/callback` (development)
     - `https://yourdomain.com/oauth/instagram/callback` (production)

### Step 2: Get Credentials
1. In your app dashboard, go to "Instagram Basic Display"
2. Copy your App ID and App Secret
3. Add to your `.env` file:
   ```
   VITE_INSTAGRAM_APP_ID=your_app_id_here
   VITE_INSTAGRAM_APP_SECRET=your_app_secret_here
   ```

## 4. Environment Variables

Create a `.env` file in your project root with all the credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Social Media OAuth Configuration
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
VITE_LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_APP_SECRET=your_facebook_app_secret
VITE_INSTAGRAM_APP_ID=your_instagram_app_id
VITE_INSTAGRAM_APP_SECRET=your_instagram_app_secret

# Optional: OpenAI for cloud AI
VITE_OPENAI_API_KEY=your_openai_api_key
```

## 5. Database Setup

Run the social media tables migration in Supabase:

```sql
-- Run create_social_media_tables.sql in Supabase SQL Editor
```

## 6. Testing OAuth Flow

1. Start your development server: `npm run dev`
2. Navigate to Social Automation page
3. Click "Connect" for any platform
4. Complete OAuth flow
5. Verify account appears in connected accounts list

## 7. Production Deployment

### Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add all the OAuth credentials
4. Update redirect URIs in platform settings to use your production domain

### Platform Redirect URI Updates
Update redirect URIs in each platform's OAuth settings:
- LinkedIn: `https://yourdomain.vercel.app/oauth/linkedin/callback`
- Facebook: `https://yourdomain.vercel.app/oauth/facebook/callback`
- Instagram: `https://yourdomain.vercel.app/oauth/instagram/callback`

## 8. Security Considerations

### Backend Implementation (Recommended)
For production, implement OAuth token exchange on your backend:

1. Create API endpoints for OAuth callbacks
2. Store client secrets on backend only
3. Handle token refresh on backend
4. Use secure HTTP-only cookies for tokens

### Current Implementation
The current implementation simulates OAuth for demonstration purposes. For production:

1. Move token exchange to backend
2. Implement proper error handling
3. Add rate limiting
4. Use HTTPS only
5. Validate all OAuth responses

## 9. Troubleshooting

### Common Issues

1. **Invalid redirect URI**: Ensure URIs match exactly in platform settings
2. **Scope errors**: Verify requested scopes are approved
3. **Token expiration**: Implement proper token refresh logic
4. **CORS issues**: Configure CORS settings in platform dashboards

### Debug Steps

1. Check browser console for OAuth errors
2. Verify environment variables are loaded
3. Test OAuth URLs manually
4. Check Supabase logs for database errors

## 10. Platform-Specific Notes

### LinkedIn
- Requires LinkedIn Page for posting
- Limited API rate limits
- Professional content focus

### Facebook
- Requires Facebook Page for posting
- Complex permission system
- Good for business content

### Instagram
- Requires Instagram Business account
- Visual content focus
- Limited API capabilities

## Next Steps

1. Set up OAuth credentials for all platforms
2. Test OAuth flows in development
3. Deploy to production with proper environment variables
4. Monitor OAuth usage and errors
5. Implement backend OAuth handling for security

For questions or issues, check the platform-specific documentation or contact support.
