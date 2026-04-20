const { app, BrowserWindow, shell, session } = require('electron')
const path = require('path')

const PROTOCOL = 'smartprint'
const BASE_URL = 'https://smartprint-tau.vercel.app'
const AUTH_URL = `${BASE_URL}/admin/auth`
const DASHBOARD_URL = `${BASE_URL}/admin/dashboard`

let mainWindow = null

// ============================================================
// Register custom protocol: smartprint://
// This is how the system browser sends auth data back to Electron
// ============================================================
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

// Helper: check if a URL should be opened in the system browser
function isOAuthUrl(url) {
  return (
    url.includes('accounts.google.com') ||
    url.includes('oauth2.googleapis.com') ||
    // Catch NextAuth's internal signin redirect chain too
    url.includes('/api/auth/signin') ||
    url.includes('/api/auth/callback')
  )
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'SmartPrint Admin',
    backgroundColor: '#F8F7F4',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      // partition: 'persist:smartprint-admin',
    },
    autoHideMenuBar: true,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.loadURL(AUTH_URL)

  // ============================================================
  // CORE FIX: Intercept Google OAuth navigation → system browser
  // Google blocks embedded WebView OAuth since 2021.
  // We must open the OAuth URL in the user's real browser.
  // ============================================================
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('[will-navigate]', url.substring(0, 120))

    if (isOAuthUrl(url)) {
      event.preventDefault()
      shell.openExternal(url)
      console.log('[OAuth] Redirected to system browser')
      return
    }

    // Redirect root to dashboard
    if (url === BASE_URL || url === BASE_URL + '/') {
      event.preventDefault()
      mainWindow.loadURL(DASHBOARD_URL)
      return
    }

    // All other navigations (within our app) proceed normally
  })

  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('[did-navigate]', url.substring(0, 120))
    if (url === BASE_URL || url === BASE_URL + '/') {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(DASHBOARD_URL)
        }
      }, 500)
    }
  })

  // Handle window.open() calls — also intercept OAuth
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[window.open]', url.substring(0, 100))

    if (isOAuthUrl(url)) {
      shell.openExternal(url)
      console.log('[OAuth popup] Opened in system browser')
      return { action: 'deny' }
    }

    // URLs within our app — load in the main window
    if (url.includes('smartprint-tau.vercel.app')) {
      mainWindow.loadURL(url)
      return { action: 'deny' }
    }

    // All other URLs — open externally
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Security: block keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const ctrl = input.control || input.meta
    const key = input.key.toLowerCase()
    if (ctrl && key === 'p') { event.preventDefault(); return }
    if (ctrl && key === 's') { event.preventDefault(); return }
    if (input.key === 'F12') { event.preventDefault(); return }
    if (ctrl && input.shift && key === 'i') { event.preventDefault(); return }
    if (ctrl && input.shift && key === 'j') { event.preventDefault(); return }
    if (ctrl && key === 'u') { event.preventDefault(); return }
    if (input.key === 'PrintScreen') { event.preventDefault(); return }
  })

  // No right-click
  mainWindow.webContents.on('context-menu', e => e.preventDefault())

  // Block downloads
  mainWindow.webContents.session.on('will-download', (event, item) => {
    event.preventDefault()
    item.cancel()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ============================================================
// Handle the protocol callback from system browser
// After OAuth completes, browser redirects to:
//   smartprint://auth?token=SESSION_TOKEN&cookie=COOKIE_NAME
// OR:
//   smartprint://auth-success  (no token — just signal)
//
// If token is provided, we set it as a cookie in Electron's
// session store so the WebView can authenticate with Vercel.
// Then we load the dashboard.
// ============================================================
async function handleAuthCallback(protocolUrl) {
  console.log('[Protocol callback]', protocolUrl)

  try {
    const url = new URL(protocolUrl)
    const token = url.searchParams.get('token')
    const cookieName = url.searchParams.get('cookie') || '__Secure-authjs.session-token'

    if (token) {
      console.log('[Auth] Setting session cookie:', cookieName)

      // Set the session cookie in Electron's default session store
      const ses = session.defaultSession

      // Set all possible cookie name variants so NextAuth can find the session
      const cookieVariants = [
        { name: '__Secure-authjs.session-token', secure: true },
        { name: 'authjs.session-token', secure: false },
        { name: '__Secure-next-auth.session-token', secure: true },
        { name: 'next-auth.session-token', secure: false },
      ]

      for (const variant of cookieVariants) {
        await ses.cookies.set({
          url: BASE_URL,
          name: variant.name,
          value: token,
          secure: variant.secure,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
        })
      }

      console.log('[Auth] All cookies set successfully')
    } else {
      console.log('[Auth] No token in callback — loading dashboard anyway')
    }

    // Load the dashboard in Electron
    console.log('[Auth] Loading dashboard...')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.loadURL(DASHBOARD_URL)
    }
  } catch (err) {
    console.error('[Auth] Error handling callback:', err)
    // Still try to load dashboard as fallback
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.loadURL(AUTH_URL)
    }
  }
}

// ============================================================
// Single instance lock + protocol handling for Windows
// On Windows, protocol URLs arrive via second-instance event
// ============================================================
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  // Another instance is running. Check if we received a protocol URL.
  // If so, the primary instance will handle it via second-instance event.
  app.quit()
} else {
  app.on('second-instance', (event, commandLine) => {
    // Find protocol URL in command line args
    const protocolUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`))
    if (protocolUrl) {
      console.log('[Protocol callback Windows]', protocolUrl)
      handleAuthCallback(protocolUrl)
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// macOS: protocol URLs arrive via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleAuthCallback(url)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})