// API utility functions for robust error handling and timeouts
import React from 'react'

export interface ApiOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
  status?: number
}

/**
 * Fetch with timeout and retry logic
 */
export async function fetchWithTimeout<T = any>(
  url: string, 
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 10000, // 10 seconds default
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        data,
        success: true,
        status: response.status
      }

    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Request timeout after ${timeout}ms`
          }
        }
        
        if (error.message.includes('404') || error.message.includes('401')) {
          return {
            success: false,
            error: error.message
          }
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt)
        console.warn(`API call failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`, error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error occurred'
  }
}

/**
 * Supabase query with timeout and error handling
 */
export async function supabaseQuery<T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: { timeout?: number; retries?: number } = {}
): Promise<ApiResponse<T>> {
  const { timeout = 10000, retries = 2 } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const { data, error } = await queryFn()
      clearTimeout(timeoutId)

      if (error) {
        throw new Error(error.message || 'Database query failed')
      }

      return {
        data: data as T,
        success: true
      }

    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Database query failed'
        }
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  return {
    success: false,
    error: 'Database query failed after all retries'
  }
}

/**
 * Health check utility
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('/api/health', { timeout: 5000 })
    return response.success
  } catch {
    return false
  }
}

/**
 * Cleanup utility for intervals and timeouts
 */
export class CleanupManager {
  private timeouts = new Set<NodeJS.Timeout>()
  private intervals = new Set<NodeJS.Timeout>()

  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const id = setTimeout(() => {
      this.timeouts.delete(id)
      callback()
    }, delay)
    this.timeouts.add(id)
    return id
  }

  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const id = setInterval(callback, delay)
    this.intervals.add(id)
    return id
  }

  clearTimeout(id: NodeJS.Timeout): void {
    clearTimeout(id)
    this.timeouts.delete(id)
  }

  clearInterval(id: NodeJS.Timeout): void {
    clearInterval(id)
    this.intervals.delete(id)
  }

  cleanup(): void {
    this.timeouts.forEach(id => clearTimeout(id))
    this.intervals.forEach(id => clearInterval(id))
    this.timeouts.clear()
    this.intervals.clear()
  }
}

/**
 * React hook for cleanup management
 */
export function useCleanup() {
  const cleanupManager = React.useRef(new CleanupManager())
  
  React.useEffect(() => {
    return () => {
      cleanupManager.current.cleanup()
    }
  }, [])

  return cleanupManager.current
}
