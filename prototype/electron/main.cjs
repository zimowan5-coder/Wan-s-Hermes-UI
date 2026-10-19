// Hermes 桌面外壳：一个无边框窗口，加载打包好的界面（dist/index.html）。
// 窗口按钮由界面里的红黄绿按钮通过 preload 暴露的 hermesWindow 控制。
const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron')
const path = require('node:path')

// 与官方 Hermes 桌面版（Hermes.exe，数据在 %APPDATA%\Hermes）区分开：
// 程序名、安装目录、本地数据目录都用 "Hermes UI"，互不覆盖。
app.setName('Hermes UI')

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 620,
    frame: false,
    show: false,
    title: 'Hermes',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0c0d14' : '#e8ebf4',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win.show())

  // 界面里的外部链接交给系统浏览器，绝不在应用窗口内打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })

  const devUrl = process.env.HERMES_UI_DEV_URL
  if (devUrl) win.loadURL(devUrl)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.on('window:minimize', e => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window:toggle-maximize', e => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})
ipcMain.on('window:close', e => BrowserWindow.fromWebContents(e.sender)?.close())

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
