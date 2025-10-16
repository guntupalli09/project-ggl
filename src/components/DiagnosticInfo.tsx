import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function DiagnosticInfo() {
  const [diagnostics, setDiagnostics] = useState<any>({})

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: any = {}

      // Check environment variables
      results.envVars = {
        hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
      }

      // Test Supabase connection
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('count')
          .limit(1)
        
        results.supabaseConnection = {
          success: !error,
          error: error?.message || null
        }
      } catch (err) {
        results.supabaseConnection = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      // Check current user
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        results.currentUser = {
          hasUser: !!user,
          userId: user?.id || null,
          email: user?.email || null,
          error: error?.message || null
        }
      } catch (err) {
        results.currentUser = {
          hasUser: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      setDiagnostics(results)
    }

    runDiagnostics()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-md text-xs">
      <h3 className="font-bold mb-2">Diagnostic Info</h3>
      <pre className="whitespace-pre-wrap overflow-auto max-h-64">
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  )
}
