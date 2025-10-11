# LinkedIn OAuth Deployment Guide

## Production Setup for https://www.getgetleads.com

### 1. LinkedIn Developer Console Configuration

In your LinkedIn Developer Console, you need to add **both** redirect URIs:

**Development:**
- `http://localhost:5173/linkedin/callback`

**Production:**
- `https://www.getgetleads.com/linkedin/callback`

### 2. Backend Deployment

The backend server (`backend/server.js`) automatically detects the environment and uses the correct redirect URI:

- **Development**: Uses `http://localhost:5173/linkedin/callback`
- **Production**: Uses `https://www.getgetleads.com/linkedin/callback`

### 3. Environment Variables

Set these environment variables in your production environment:

```bash
NODE_ENV=production
PORT=3001
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://www.getgetleads.com/linkedin/callback
FRONTEND_URL=https://www.getgetleads.com
```

### 4. Frontend Configuration

The frontend (`src/lib/linkedinOAuth.ts`) automatically detects the environment:

- **Development**: Calls `http://localhost:3001/api/linkedin/*`
- **Production**: Calls `https://www.getgetleads.com/api/linkedin/*`

### 5. Vercel Deployment

For Vercel deployment, you need to:

1. **Deploy the backend** as a separate Vercel function or to a different service
2. **Set environment variables** in Vercel dashboard
3. **Update the frontend** to point to your production backend URL

### 6. Testing

**Development Testing:**
1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Test LinkedIn OAuth flow

**Production Testing:**
1. Deploy backend to your production server
2. Deploy frontend to Vercel
3. Test LinkedIn OAuth flow on https://www.getgetleads.com

### 7. LinkedIn Developer Console Checklist

- [ ] Add `http://localhost:5173/linkedin/callback` for development
- [ ] Add `https://www.getgetleads.com/linkedin/callback` for production
- [ ] Ensure "Sign In with LinkedIn using OpenID Connect" is enabled
- [ ] Ensure "Share on LinkedIn" is enabled
- [ ] Copy Client ID and Client Secret to environment variables

### 8. Troubleshooting

**Common Issues:**

1. **"Invalid state parameter"**: Backend state store was cleared or server restarted
2. **"Invalid redirect_uri"**: LinkedIn console doesn't have the correct redirect URI
3. **CORS errors**: Backend CORS configuration needs to include your production domain

**Debug Commands:**
- Check backend health: `curl https://www.getgetleads.com/api/health`
- Check state store: `curl https://www.getgetleads.com/api/debug/states`
- Test LinkedIn auth: `curl https://www.getgetleads.com/api/linkedin/auth`

