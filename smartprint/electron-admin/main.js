const { app, BrowserWindow, shell, protocol, net, ipcMain } = require('electron')
const path = require('path')
const https = require('https')

// --- CONFIGURATION ---
// Set to http://localhost:3000 for local development
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true';
const BASE_URL = IS_DEV ? 'http://localhost:3000' : 'https://smartprint-284884896914.asia-southeast1.run.app';
// ---------------------

const AUTH_URL = `${BASE_URL}/admin/auth`
const DASHBOARD_URL = `${BASE_URL}/admin/dashboard`
const BRIDGE_URL = `${BASE_URL}/admin/auth-bridge`

let mainWindow = null
let lastAuthSuccessAt = 0

function getElectronPageSize(pageSize) {
  const normalized = (pageSize || 'A4').toString().replace(/×/g, 'x').trim().toLowerCase()
  const preset = {
    a2: 'A2',
    a3: 'A3',
    a4: 'A4',
    a5: 'A5',
    a6: 'A6',
    letter: 'Letter',
    legal: 'Legal',
    tabloid: 'Tabloid',
    executive: 'Executive',
    b4: 'B4',
    b5: 'B5',
  }
  if (preset[normalized]) return preset[normalized]

  // Electron custom page sizes use microns.
  const customMicrons = {
    '4x6 in': { width: 101600, height: 152400 },
    '5x7 in': { width: 127000, height: 177800 },
    '10x15 cm': { width: 100000, height: 150000 },
    '13x18 cm': { width: 130000, height: 180000 },
    '20x25 cm': { width: 200000, height: 250000 },
  }

  return customMicrons[normalized] || 'A4'
}

// Prevent GPU cache permission warnings/crashes on some Windows environments.
app.disableHardwareAcceleration()

// Register smartprint:// protocol BEFORE app is ready
// Register smartprint:// protocol
const protocolArgs = process.defaultApp && process.argv[1] ? [path.resolve(process.argv[1])] : []
const protocolClientSet = app.setAsDefaultProtocolClient('smartprint', process.execPath, protocolArgs)
console.log('[Protocol] Registration success:', protocolClientSet)

if (!process.defaultApp) {
  app.setAsDefaultProtocolClient('smartprint')
}

const SESSION_COOKIE_NAMES = [
  '__Secure-authjs.session-token',
  'authjs.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
]

async function findExistingSessionCookie(session) {
  for (const name of SESSION_COOKIE_NAMES) {
    try {
      const cookies = await session.cookies.get({ url: BASE_URL, name })
      if (cookies && cookies.length > 0 && cookies[0].value) {
        return cookies[0]
      }
    } catch (e) {
      // ignore and continue
    }
  }
  return null
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
      preload: path.join(__dirname, 'preload.js'),
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

  // If a valid session cookie already exists in the persistent store,
  // skip the sign-in screen and go straight to the dashboard. The server
  // enforces the 3-day inactivity policy and will bounce us back to
  // /admin/auth?reason=session_expired if the session is no longer valid.
  findExistingSessionCookie(mainWindow.webContents.session)
    .then((cookie) => {
      const targetUrl = cookie ? DASHBOARD_URL : AUTH_URL
      if (cookie) {
        console.log('[Auth] Persistent session found, loading dashboard directly')
      } else {
        console.log('[Auth] No session cookie, loading auth page')
      }
      mainWindow.loadURL(targetUrl)
    })
    .catch((err) => {
      console.error('[Auth] Cookie lookup failed, falling back to auth page:', err)
      mainWindow.loadURL(AUTH_URL)
    })

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
    if (url.startsWith(BASE_URL) && url.includes('/admin/dashboard')) {
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
          lastAuthSuccessAt = Date.now()
          setSessionAndLoadDashboard(result.sessionToken)
        } else {
          console.error('[Auth] Token verification failed:', result.error)
          // Auth bridge can fire duplicate deep-link callbacks; ignore "already used"
          // shortly after a successful verification to avoid bouncing back to sign-in.
          const recentSuccess = Date.now() - lastAuthSuccessAt < 20000
          if (recentSuccess && result.error === 'Token already used') {
            console.log('[Auth] Ignoring duplicate used token callback')
            return
          }
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
  
  const cookieNames = SESSION_COOKIE_NAMES

  const setCookie = (name) => {
    return mainWindow.webContents.session.cookies.set({
      url: BASE_URL,
      name: name,
      value: sessionToken,
      secure: BASE_URL.startsWith('https'),
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

// Get list of system printers
ipcMain.handle('smartprint-get-printers', async () => {
  const dummyWin = new BrowserWindow({ show: false })
  const printers = await dummyWin.webContents.getPrintersAsync()
  dummyWin.close()
  return printers
})

// Handle manual token verification
ipcMain.on('smartprint-verify-token', (event, token) => {
  console.log('[IPC] Manual token verification requested')
  verifyTransferToken(token)
})

ipcMain.on('smartprint-open-external', (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url)
  }
})

// Handle silent printing from dashboard
ipcMain.on('smartprint-print', async (event, { data, color, landscape, pageSize, copies, printerName, isEncrypted }) => {
  console.log('[Print] Received print request:', { color, landscape, pageSize, copies, isEncrypted: !!isEncrypted })

  // Prevent Chromium download/save dialog if non-renderable data URL is passed
  if (typeof data !== 'string' || !/^data:(application\/pdf|image\/)/i.test(data)) {
    event.reply('print-result', { success: false, reason: 'Unsupported file format for direct hardware printing.' })
    return
  }

  const electronPageSize = getElectronPageSize(pageSize)
  const virtualKeywords = ['pdf', 'xps', 'onenote', 'fax', 'microsoft print', 'send to', 'cutepdf', 'foxit', 'adobe pdf', 'save as']
  const isVirtualPrinter = (name) => virtualKeywords.some(k => (name || '').toLowerCase().includes(k))
  
  let printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Load the file data (DataURL)
  printWindow.loadURL(data)

  printWindow.webContents.on('did-finish-load', async () => {
    console.log('[Print] Content loaded, selecting printer...')
    
    try {
      const printers = await printWindow.webContents.getPrintersAsync();
      let selectedPrinter = printers.find(p => p.isDefault);
      
      // If a specific printer was requested, use it
      if (printerName) {
        const target = printers.find(p => p.name === printerName);
        if (target) selectedPrinter = target;
      } else if (selectedPrinter && isVirtualPrinter(selectedPrinter.name)) {
        // If default is virtual, try to find a physical one
        const physicalPrinter = printers.find(p => !isVirtualPrinter(p.name));
        if (physicalPrinter) selectedPrinter = physicalPrinter;
      }

      if (isEncrypted && (!selectedPrinter || isVirtualPrinter(selectedPrinter.name))) {
        console.warn('[Print] Virtual printer allowed for demo mode:', selectedPrinter?.name || 'Default');
      }

      console.log('[Print] Using printer:', selectedPrinter?.name || 'Default');

      // Slight delay to ensure rendering is complete
      setTimeout(() => {
        printWindow.webContents.print({
          silent: true,
          printBackground: true,
          deviceName: selectedPrinter?.name || '',
          color: !!color,
          landscape: !!landscape,
          pageSize: electronPageSize,
          copies: parseInt(copies) || 1
        }, (success, failureReason) => {
          console.log('[Print] Result:', success ? 'Success' : 'Failed', failureReason || '')
          event.reply('print-result', { success, reason: failureReason })
          printWindow.close()
        })
      }, 1000)
    } catch (err) {
      console.error('[Print] Printer selection failed:', err);
      event.reply('print-result', { success: false, reason: 'Printer selection failed' });
      printWindow.close();
    }
  })

  printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Print] Failed to load content:', errorDescription)
    event.reply('print-result', { success: false, reason: 'Failed to load content' })
    printWindow.close()
  })
})

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