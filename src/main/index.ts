import { existsSync } from 'node:fs'
import { mkdir, realpath, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron'
import type { ExportRequest } from '../shared/api'
import { messagesFor, resolveLocale } from '../shared/i18n'
import { exportClips } from './export'
import { findFfmpeg } from './ffmpeg-args'
import { runFfmpeg, stopAllFfmpeg } from './ffmpeg'
import { handleMediaProtocol, registerMediaScheme } from './media-protocol'
import { menuTemplate } from './menu'
import { existingAncestor } from './paths'

registerMediaScheme()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 860,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#161617' : '#f5f4f2',
    title: 'Cuts',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true
    }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

app.whenReady().then(() => {
  const t = messagesFor(resolveLocale(app.getPreferredSystemLanguages()))
  const openVideo = () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
    win.webContents.send('menu-open-video')
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(t, app.name, { openVideo, openUrl: (url) => void shell.openExternal(url) })))
  app.setAboutPanelOptions({ credits: t.aboutCredits })
  handleMediaProtocol()

  ipcMain.handle('open-video', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: t.videoFilter, extensions: ['mov', 'mp4', 'm4v', 'mkv', 'webm'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('choose-folder', async (event, current: string | null) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: current ? existingAncestor(current, existsSync) : undefined
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('export-clips', (event, request: ExportRequest) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return exportClips(request, {
      ffmpeg: findFfmpeg(existsSync, join(process.resourcesPath, '..', 'MacOS', 'ffmpeg'), !process.mas),
      exists: existsSync,
      ensureDir: async (path) => {
        await mkdir(path, { recursive: true })
      },
      remove: (path) => rm(path, { force: true }),
      run: runFfmpeg,
      onProgress: (progress) => event.sender.send('export-progress', progress),
      t,
      confirmOverwrite: async (names) => {
        const { response } = await dialog.showMessageBox(win, {
          type: 'question',
          buttons: [t.overwrite, t.cancel],
          defaultId: 0,
          cancelId: 1,
          message: t.overwriteMessage,
          detail: names.join('\n')
        })
        return response === 0
      }
    })
  })

  ipcMain.handle('movies-dir', () => realpath(app.getPath('videos')).catch(() => app.getPath('videos')))

  ipcMain.on('reveal', (_event, path: string) => shell.showItemInFolder(path))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', stopAllFfmpeg)
app.on('window-all-closed', () => app.quit())
