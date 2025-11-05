/**
 * Utility functions for making API calls to the other site
 * This will proxy through the Next.js API route
 */

const API_BASE = '/api/proxy'

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    config.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, config)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('Content-Type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    return await response.text()
  } catch (error) {
    console.error('API request error:', error)
    throw error
  }
}

// Convenience methods
export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
}
