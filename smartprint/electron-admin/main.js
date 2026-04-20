const { app, BrowserWindow, shell, protocol, net } = require('electron')
const path = require('path')
const https = require('https')

const BASE_URL = 'https://smartprint-tau.vercel.app'
const AUTH_URL = `${BASE_URL}/admin/auth`
const DASHBOARD_URL = `${BASE_URL}/admin/dashboard`
const BRIDGE_URL = `${BASE_URL}/admin/auth-bridge`

let mainWindow = null

// Register smartprint:// protocol BEFORE app is ready
// Register smartprint:// protocol
const protocolClientSet = app.setAsDefaultProtocolClient('smartprint', process.execPath, [path.resolve(process.argv[1])])
console.log('[Protocol] Registration success:', protocolClientSet)

if (!process.defaultApp) {
  app.setAsDefaultProtocolClient('smartprint')
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
    },
    autoHideMenuBar: true,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.loadURL(AUTH_URL)

  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('[will-navigate]', url.substring(0, 100))
    
    // Intercept Google OAuth and open in system browser
    if (
      url.includes('accounts.google.com') || 
      url.includes('oauth2.googleapis.com') ||
      url.includes('mode=electron') ||
      url.includes('/admin/auth-bridge')
    ) {
      event.preventDefault()
      shell.openExternal(url)
      console.log('[OAuth/Bridge] Redirected to system browser via will-navigate')
      return
    }
  })

  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('[did-navigate]', url.substring(0, 80))
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a Google OAuth URL or our special auth-mode URL, open in system browser
    if (
      url.includes('accounts.google.com') || 
      url.includes('oauth2.googleapis.com') ||
      url.includes('mode=electron') ||
      url.includes('/admin/auth-bridge')
    ) {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    // URLs within our app dashboard — load in the main window
    if (url.includes('smartprint-tau.vercel.app/admin/dashboard')) {
      mainWindow.loadURL(url)
      return { action: 'deny' }
    }

    // All other URLs — open externally
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Security
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const ctrl = input.control || input.meta
    const key = input.key.toLowerCase()
    if (ctrl && key === 'p') { event.preventDefault(); return }
    if (ctrl && key === 's') { event.preventDefault(); return }
    if (input.key === 'F12') { event.preventDefault(); return }
    if (ctrl && input.shift && key === 'i') { event.preventDefault(); return }
    if (input.key === 'PrintScreen') { event.preventDefault(); return }
  })

  mainWindow.webContents.on('context-menu', e => e.preventDefault())
  
  mainWindow.webContents.session.on('will-download', (event, item) => {
    event.preventDefault()
    item.cancel()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// Handle deep link: smartprint://auth?token=XXXX
function handleDeepLink(url) {
  console.log('[Deep link received]', url)
  
  if (!url.startsWith('smartprint://')) return
  
  try {
    const urlObj = new URL(url)
    const token = urlObj.searchParams.get('token')
    
    if (urlObj.hostname === 'auth' && token) {
      console.log('[Auth] Got transfer token, verifying...')
      verifyTransferToken(token)
    }
  } catch (e) {
    console.error('[Deep link] Parse error:', e)
  }
}

function verifyTransferToken(token) {
  const apiUrl = `${BASE_URL}/api/auth/transfer?token=${token}`
  
  https.get(apiUrl, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try {
        const result = JSON.parse(data)
        
        if (result.success && result.sessionToken) {
          console.log('[Auth] Session verified for:', result.userEmail)
          setSessionAndLoadDashboard(result.sessionToken)
        } else {
          console.error('[Auth] Token verification failed:', result.error)
          if (mainWindow) mainWindow.loadURL(AUTH_URL)
        }
      } catch (e) {
        console.error('[Auth] Response parse error:', e)
        if (mainWindow) mainWindow.loadURL(AUTH_URL)
      }
    })
  }).on('error', (err) => {
    console.error('[Auth] API request failed:', err)
    if (mainWindow) mainWindow.loadURL(AUTH_URL)
  })
}

function setSessionAndLoadDashboard(sessionToken) {
  if (!mainWindow) return
  
  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token'
  ]

  const setCookie = (name) => {
    return mainWindow.webContents.session.cookies.set({
      url: BASE_URL,
      name: name,
      value: sessionToken,
      secure: true,
      httpOnly: true,
      path: '/',
      sameSite: 'lax'
    })
  }

  // Set all possible session cookie names for compatibility
  Promise.all(cookieNames.map(name => setCookie(name)))
    .then(() => {
      console.log('[Auth] All session cookies set, loading dashboard...')
      mainWindow.loadURL(DASHBOARD_URL)
      mainWindow.focus()
    })
    .catch((err) => {
      console.error('[Auth] Cookie set error:', err)
      mainWindow.loadURL(DASHBOARD_URL)
    })
}

// Single instance + deep link handling
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  // Windows: deep link comes via second-instance
  app.on('second-instance', (event, commandLine) => {
    const deepLink = commandLine.find(arg => arg.startsWith('smartprint://'))
    if (deepLink) handleDeepLink(deepLink)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// macOS: deep link
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
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