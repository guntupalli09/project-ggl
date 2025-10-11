// Environment detection and configuration
export interface EnvironmentConfig {
  isProduction: boolean
  isDevelopment: boolean
  apiBaseUrl: string
  googleRedirectUri: string
  googleClientId: string
  googleClientSecret?: string
}

export function getEnvironmentConfig(): EnvironmentConfig {
  // Detect environment based on multiple factors
  const isViteProduction = import.meta.env.MODE === 'production'
  const isProductionHostname = window.location.hostname === 'getgetleads.com' || 
                              window.location.hostname === 'www.getgetleads.com'
  const isProduction = isViteProduction || isProductionHostname
  
  const isDevelopment = !isProduction

  // Get configuration based on environment
  const config: EnvironmentConfig = {
    isProduction,
    isDevelopment,
    apiBaseUrl: isProduction ? 'https://www.getgetleads.com' : 'http://localhost:5173',
    googleRedirectUri: isProduction 
      ? 'https://www.getgetleads.com/api/google/callback'
      : 'http://localhost:5173/profile',
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    googleClientSecret: isDevelopment ? import.meta.env.VITE_GOOGLE_CLIENT_SECRET : undefined
  }

  // Log environment detection for debugging
  console.log('Environment Configuration:', {
    mode: import.meta.env.MODE,
    hostname: window.location.hostname,
    isViteProduction,
    isProductionHostname,
    isProduction,
    isDevelopment,
    hasClientId: !!config.googleClientId,
    hasClientSecret: !!config.googleClientSecret,
    redirectUri: config.googleRedirectUri
  })

  return config
}

// Export singleton instance
export const environment = getEnvironmentConfig()
