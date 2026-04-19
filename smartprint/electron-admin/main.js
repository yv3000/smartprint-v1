const { app, BrowserWindow, shell } = require('electron')

const ADMIN_URL = 'https://smartprint-tau.vercel.app/admin/auth'
const DASHBOARD_URL = 'https://smartprint-tau.vercel.app/admin/dashboard'
const BASE_URL = 'https://smartprint-tau.vercel.app'

let mainWindow = null

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
      // webSecurity: false is important for Electron + Vercel OAuth
      webSecurity: false,
      // Persistent session so login is remembered
      partition: 'persist:smartprint-admin',
    },
    autoHideMenuBar: true,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Load admin login page
  mainWindow.loadURL(ADMIN_URL)

  // LOG navigation but NEVER block anything
  // This is the most important fix - no event.preventDefault() calls
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('[navigate]', url)
    // DO NOT call event.preventDefault() here ever
    // Let ALL navigation happen freely including Google OAuth
  })

  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('[landed]', url)
    
    // After OAuth completes, NextAuth may redirect to homepage
    // If that happens, send to dashboard instead
    if (url === BASE_URL || url === BASE_URL + '/') {
      console.log('[redirect] Homepage detected, going to dashboard')
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(DASHBOARD_URL)
        }
      }, 1000)
    }
  })

  // Handle window.open() calls from the web page
  // NextAuth sometimes uses window.open for OAuth popup
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[window.open]', url)
    
    // If Google OAuth popup is requested, load in main window instead
    if (url.includes('accounts.google.com') || 
        url.includes('oauth2.googleapis.com')) {
      mainWindow.loadURL(url)
      return { action: 'deny' }
    }
    
    // If our own site, load in main window
    if (url.includes('smartprint-tau.vercel.app')) {
      mainWindow.loadURL(url)
      return { action: 'deny' }
    }
    
    // External links open in system browser
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // ============================================================
  // SECURITY: Block keyboard shortcuts only
  // Do NOT restrict navigation
  // ============================================================
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

  // No right-click context menu
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault())

  // Block file downloads
  mainWindow.webContents.session.on('will-download', (event, item) => {
    console.log('[download blocked]', item.getFilename())
    event.preventDefault()
    item.cancel()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Single instance - prevent multiple windows
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})