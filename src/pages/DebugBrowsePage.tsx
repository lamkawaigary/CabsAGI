// Simple debug page to test routing
import { useEffect } from 'react'

export default function DebugBrowsePage() {
  useEffect(() => {
    console.log('[DebugBrowsePage] Component mounted!')
  }, [])

  return (
    <div style={{ padding: 20, textAlign: 'center', fontSize: 24 }}>
      <h1>Debug Browse Page Works!</h1>
      <p>If you see this, routing is working.</p>
    </div>
  )
}
