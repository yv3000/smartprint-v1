'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthBridgePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Connecting to SmartPrint Admin...')
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const transferToElectron = async () => {
      try {
        setMessage('Getting secure transfer token...')
        
        // Get transfer token from server
        const res = await fetch('/api/auth/transfer', {
          method: 'POST',
          credentials: 'include'
        })
        
        if (!res.ok) {
          throw new Error('Failed to get transfer token')
        }
        
        const { transferToken } = await res.json()
        setToken(transferToken)
        
        setMessage('Sign-in successful! Transferring to SmartPrint Admin...')
        
        // Trigger the deep link once to avoid duplicate token consumption races.
        const deepLink = `smartprint://auth?token=${transferToken}`
        
        window.location.href = deepLink
        
        setStatus('success')
        setMessage('Authentication sent to app. You can close this tab now.')
        
        // Fallback: if deep link doesn't work after 3s, show manual button
        setTimeout(() => {
          setMessage('If the SmartPrint app didn\'t open, click the button below.')
        }, 3000)

      } catch (error) {
        console.error('Bridge error:', error)
        setStatus('error')
        setMessage('Something went wrong. Please try signing in again.')
        setTimeout(() => router.push('/admin/auth'), 3000)
      }
    }

    transferToElectron()
  }, [router])

  const handleManualLaunch = () => {
    if (token) {
      window.location.href = `smartprint://auth?token=${token}`
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8F7F4',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      padding: '24px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid #E5E7EB'
      }}>
        {status === 'loading' && (
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#4F46E5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
        )}
        {status === 'success' && (
          <div style={{
            width: '56px', height: '56px',
            background: '#ECFDF5',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '28px'
          }}>✓</div>
        )}
        {status === 'error' && (
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>⚠️</div>
        )}
        
        <h1 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#1A1A1A',
          marginBottom: '8px'
        }}>
          {status === 'loading' ? 'Connecting...' : 
           status === 'success' ? 'Sign-in Successful!' : 'Error'}
        </h1>
        
        <p style={{
          fontSize: '15px',
          color: '#6B7280',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          {message}
        </p>

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ 
               padding: '12px', 
               backgroundColor: '#F0FDF4', 
               borderRadius: '12px', 
               border: '1px solid #DCFCE7',
               marginBottom: '8px'
             }}>
               <p style={{ fontSize: '13px', color: '#166534', fontWeight: '500', margin: 0 }}>
                 App launch request sent. Check your taskbar.
               </p>
             </div>
            <button
              onClick={handleManualLaunch}
              style={{
                background: '#4F46E5',
                color: 'white',
                border: 'none',
                padding: '14px 24px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              Open SmartPrint App Now
            </button>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px' }}>
              You can safely close this browser window once the app opens.
            </p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
