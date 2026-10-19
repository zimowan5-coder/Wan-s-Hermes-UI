// 只向界面暴露三个窗口操作，界面拿不到任何 Node / Electron 能力。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('hermesWindow', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close')
})
