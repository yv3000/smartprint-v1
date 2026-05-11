const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    let validChannels = ['smartprint-print']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  on: (channel, func) => {
    let validChannels = ['print-result']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  once: (channel, func) => {
    let validChannels = ['print-result']
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => func(...args))
    }
  },
  getPrinters: () => {
    return ipcRenderer.invoke('smartprint-get-printers')
  },
  verifyToken: (token) => {
    ipcRenderer.send('smartprint-verify-token', token)
  },
  openExternal: (url) => {
    ipcRenderer.send('smartprint-open-external', url)
  }
})
