import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { ExportRequest } from '../shared/api'
import { exportClips } from './export'
import { findFfmpeg } from './ffmpeg-args'
import { runFfmpeg } from './ffmpeg'
import { handleMediaProtocol, registerMediaScheme } from './media-protocol'

registerMediaScheme()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 860,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: '#09090b',
    title: 'Carousel Cutter',
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
  handleMediaProtocol()

  ipcMain.handle('open-video', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Vídeo', extensions: ['mov', 'mp4', 'm4v', 'mkv', 'webm'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('choose-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('export-clips', (event, request: ExportRequest) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return exportClips(request, {
      ffmpeg: findFfmpeg(existsSync),
      exists: existsSync,
      run: runFfmpeg,
      onProgress: (progress) => event.sender.send('export-progress', progress),
      confirmOverwrite: async (names) => {
        const { response } = await dialog.showMessageBox(win, {
          type: 'question',
          buttons: ['Sobrescribir', 'Cancelar'],
          defaultId: 0,
          cancelId: 1,
          message: 'Ya existen estos archivos en la carpeta:',
          detail: names.join('\n')
        })
        return response === 0
      }
    })
  })

  ipcMain.on('reveal', (_event, path: string) => shell.showItemInFolder(path))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
