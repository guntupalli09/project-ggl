// Health check endpoint for monitoring and debugging

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Test database connection
    const { data, error } = await supabase
      .from('user_settings')
      .select('count')
      .limit(1)

    const dbHealthy = !error

    // Check environment variables
    const envHealthy = !!(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Check external services
    const externalServices = {
      supabase: dbHealthy,
      environment: envHealthy
    }

    const allHealthy = Object.values(externalServices).every(Boolean)
    const responseTime = Date.now() - startTime

    const healthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: externalServices,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    const statusCode = allHealthy ? 200 : 503
    res.status(statusCode).json(healthStatus)

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        supabase: false,
        environment: false
      }
    })
  }
}
