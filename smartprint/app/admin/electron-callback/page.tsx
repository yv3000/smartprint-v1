import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Electron OAuth Callback Page (Server Component)
 * 
 * After Google OAuth completes in the system browser, NextAuth redirects here.
 * This page reads the session cookie (server-side, so HttpOnly is accessible)
 * and redirects to the smartprint:// custom protocol so Electron can capture
 * the session token and set it in its own cookie store.
 * 
 * Flow:
 * 1. OAuth completes → NextAuth sets session cookie in browser
 * 2. NextAuth redirects to /admin/electron-callback (this page)
 * 3. This page reads the cookie value
 * 4. Redirects browser to smartprint://auth?token=VALUE
 * 5. Electron catches the protocol URL and sets the cookie internally
 * 6. Electron loads the dashboard
 */
export default async function ElectronCallbackPage() {
  const cookieStore = await cookies()

  // Try all possible NextAuth cookie names (v4 and v5, secure and non-secure)
  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ]

  let sessionToken: string | undefined
  let foundCookieName: string | undefined

  for (const name of cookieNames) {
    const cookie = cookieStore.get(name)
    if (cookie?.value) {
      sessionToken = cookie.value
      foundCookieName = name
      break
    }
  }

  if (!sessionToken || !foundCookieName) {
    // No session cookie found — OAuth might have failed
    redirect('/admin/auth?error=no-session')
  }

  // Build the custom protocol URL to send the token back to Electron
  const protocolUrl = `smartprint://auth?token=${encodeURIComponent(sessionToken)}&cookie=${encodeURIComponent(foundCookieName)}`

  return (
    <html>
      <head>
        <title>Returning to SmartPrint Admin...</title>
        <meta httpEquiv="refresh" content={`1;url=${protocolUrl}`} />
      </head>
      <body style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#F8F7F4',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <div style={{ 
            width: '64px', height: '64px', margin: '0 auto 24px',
            backgroundColor: '#10B981', borderRadius: '22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px' }}>
            Sign-in Successful!
          </h1>
          <p style={{ fontSize: '15px', color: '#1A1A1A99', margin: '0 0 24px', lineHeight: '1.5' }}>
            Returning to SmartPrint Admin app...
          </p>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '16px', 
            padding: '16px 20px',
            border: '1px solid #E5E7EB',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>
              If the app doesn&apos;t open automatically,{' '}
              <a href={protocolUrl} style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: 600 }}>
                click here to return to SmartPrint
              </a>
              .
            </p>
          </div>
          <p style={{ fontSize: '12px', color: '#1A1A1A30' }}>
            You can close this browser tab after the app opens.
          </p>
        </div>
      </body>
    </html>
  )
}
