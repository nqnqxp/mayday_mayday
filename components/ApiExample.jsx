'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

export default function ApiExample() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTestApi = async () => {
    setLoading(true)
    setError(null)
    try {
      // Example: GET request to 'test' endpoint on the other server
      const result = await api.get('test')
      setData(result)
    } catch (err) {
      setError(err.message)
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      position: 'absolute', 
      top: 10, 
      left: 10, 
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '300px'
    }}>
      <h3>API Proxy Test</h3>
      <button 
        onClick={handleTestApi}
        disabled={loading}
        style={{
          padding: '10px 20px',
          margin: '10px 0',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Loading...' : 'Test API Connection'}
      </button>
      
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}
      
      {data && (
        <div style={{ marginTop: '10px' }}>
          <strong>Response:</strong>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
