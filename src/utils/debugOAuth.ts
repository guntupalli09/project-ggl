// Debug utility for OAuth redirect URIs
export const debugOAuth = () => {
  const origin = window.location.origin
  const linkedinRedirectUri = `${origin}/oauth/linkedin/callback`
  
  console.log('=== OAuth Debug Information ===')
  console.log('Current origin:', origin)
  console.log('LinkedIn redirect URI:', linkedinRedirectUri)
  console.log('Expected for localhost:', 'http://localhost:5173/oauth/linkedin/callback')
  console.log('Expected for Vercel:', 'https://your-app.vercel.app/oauth/linkedin/callback')
  console.log('===============================')
  
  return {
    origin,
    linkedinRedirectUri,
    expectedLocalhost: 'http://localhost:5173/oauth/linkedin/callback',
    expectedVercel: 'https://your-app.vercel.app/oauth/linkedin/callback'
  }
}

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).debugOAuth = debugOAuth
}
