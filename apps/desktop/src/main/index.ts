import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, ShareMenu, shell, type MessageBoxOptions } from 'electron'
import electronUpdater from 'electron-updater'
import type { ExportRequest, FrameRequest, Session } from '../shared/api'
import { AUDIO_EXTENSIONS, BACKGROUND_EXTENSIONS, VIDEO_EXTENSIONS, mediaKind } from '../shared/video-formats'
import { importBackground, isOwnedBackground, type BackgroundDeps } from './background'
import { messagesFor, resolveLocale } from '@cuts/core/i18n'
import type { ExportOverlay } from '@cuts/core/overlay'
import { exportClips, exportFrame, type ExportDeps } from './export'
import { bundledFfmpegPath, findFfmpeg } from './ffmpeg-args'
import { cancelFfmpeg, captureFfmpeg, readFfmpegInfo, runFfmpeg, stopAllFfmpeg } from './ffmpeg'
import { handleMediaProtocol, registerMediaScheme } from './media-protocol'
import { menuTemplate } from './menu'
import { importOverlay, isOwnedOverlay, type OverlayDeps } from './overlay'
import { existingAncestor } from './paths'
import { forgetRecent, loadRecents, posterFile, posterTime, readPoster, rememberRecent, toRecentVideo, type RecentEntry } from './recents'
import { loadSession, saveSession } from './sessions'
import { UPDATE_CHECK_INTERVAL_MS, updatesEnabled } from './updates'
import { parseFrameRate, peaksFromSamples, thumbnailArgs, waveformArgs } from './preview'

registerMediaScheme()

const pendingPaths: string[] = []
let sendPath: ((path: string) => void) | null = null
app.on('open-file', (event, path) => {
  event.preventDefault()
  if (sendPath) sendPath(path)
  else pendingPaths.push(path)
})

const THUMBNAIL_HEIGHT = 96
const POSTER_HEIGHT = 180
const DEFAULT_FRAME_RATE = 30

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 860,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#161617' : '#f5f4f2',
    title: 'Cuts',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true
    }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

app.whenReady().then(() => {
  const t = messagesFor(resolveLocale(app.getPreferredSystemLanguages()))
  const mainWindow = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const openVideo = () => {
    const win = mainWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
    win.webContents.send('menu-open-video')
  }
  const command = (name: 'undo' | 'redo') => () => mainWindow()?.webContents.send('menu-command', name)
  const { autoUpdater } = electronUpdater
  const updates = updatesEnabled({ packaged: app.isPackaged, mas: process.mas === true, windowsStore: process.windowsStore === true })
  const checkInBackground = () => void autoUpdater.checkForUpdates().catch(() => {})
  const checkForUpdates = async () => {
    const win = mainWindow()
    const show = (options: MessageBoxOptions) => (win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options))
    try {
      const result = await autoUpdater.checkForUpdates()
      if (!result?.isUpdateAvailable) await show({ type: 'info', message: t.upToDate })
    } catch {
      await show({ type: 'warning', message: t.updateCheckFailed })
    }
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      menuTemplate(t, app.name, {
        openVideo,
        exportFrame: () => mainWindow()?.webContents.send('menu-export-frame'),
        showShortcuts: () => mainWindow()?.webContents.send('menu-shortcuts'),
        openUrl: (url) => void shell.openExternal(url),
        undo: command('undo'),
        redo: command('redo'),
        checkForUpdates: updates ? () => void checkForUpdates() : undefined
      })
    )
  )
  app.setAboutPanelOptions({ credits: t.aboutCredits })
  const openedVideos = new Set<string>()
  const recentsFile = join(app.getPath('userData'), 'recent-videos.json')
  const sessionsDir = join(app.getPath('userData'), 'sessions')
  const postersDir = join(app.getPath('userData'), 'posters')
  const savePoster = async (path: string) => {
    if (mediaKind(path) === 'audio') return
    const ffmpeg = bundledFfmpeg()
    if (!ffmpeg) return
    const session = await loadSession(sessionsDir, path)
    const jpeg = await captureFfmpeg(ffmpeg, thumbnailArgs(path, posterTime(session?.clips ?? []), POSTER_HEIGHT))
    if (jpeg.byteLength === 0) return
    await mkdir(postersDir, { recursive: true })
    await writeFile(posterFile(postersDir, path), jpeg)
  }
  const allowVideo = (path: string, bookmark?: string) => {
    openedVideos.add(path)
    app.addRecentDocument(path)
    if (!process.mas || bookmark) {
      void rememberRecent(recentsFile, { path, openedAt: Date.now(), bookmark })
      savePoster(path).catch(() => {})
    }
  }
  const opened = (path: string) => {
    if (!openedVideos.has(path)) throw new Error('This video was not opened in Cuts')
    return path
  }
  const overlaysDir = join(app.getPath('userData'), 'overlays')
  const backgroundsDir = join(app.getPath('userData'), 'backgrounds')
  handleMediaProtocol((path) => openedVideos.has(path) || isOwnedOverlay(path, overlaysDir) || isOwnedBackground(path, backgroundsDir))
  ipcMain.on('allow-video', (event, path: string) => {
    allowVideo(path)
    event.returnValue = null
  })

  ipcMain.handle('open-video', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: t.videoFilter, extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS] }],
      securityScopedBookmarks: process.mas === true
    })
    if (result.canceled) return null
    allowVideo(result.filePaths[0], result.bookmarks?.[0])
    return result.filePaths[0]
  })

  const overlayDeps: OverlayDeps = {
    read: async (path) => new Uint8Array(await readFile(path)),
    write: async (path, bytes) => {
      await mkdir(overlaysDir, { recursive: true })
      await writeFile(path, bytes)
    },
    list: (dir) => readdir(dir).catch(() => []),
    remove: (path) => rm(path, { force: true }),
    now: Date.now
  }
  const copyOverlay = async (source: string) => (await importOverlay(source, overlaysDir, overlayDeps)) ?? 'invalid'

  ipcMain.handle('choose-overlay', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: t.overlayFilter, extensions: ['png'] }]
    })
    return result.canceled ? null : copyOverlay(result.filePaths[0])
  })

  ipcMain.handle('import-overlay', (_event, path: string) => copyOverlay(path))

  const backgroundDeps: BackgroundDeps = {
    size: async (path) => (await stat(path)).size,
    copy: async (from, to) => {
      await mkdir(backgroundsDir, { recursive: true })
      await copyFile(from, to)
    },
    list: (dir) => readdir(dir).catch(() => []),
    remove: (path) => rm(path, { force: true }),
    now: Date.now
  }
  const copyBackground = (source: string) => importBackground(source, backgroundsDir, backgroundDeps)

  ipcMain.handle('choose-background', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: t.backgroundFilter, extensions: BACKGROUND_EXTENSIONS }]
    })
    return result.canceled ? null : copyBackground(result.filePaths[0])
  })

  ipcMain.handle('import-background', (_event, path: string) => copyBackground(path))

  ipcMain.handle('choose-folder', async (event, current: string | null) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: current ? existingAncestor(current, existsSync) : undefined
    })
    return result.canceled ? null : result.filePaths[0]
  })

  let cancelled = false
  ipcMain.on('cancel-export', () => {
    cancelled = true
    cancelFfmpeg()
  })

  const exportDeps = (event: Electron.IpcMainInvokeEvent): ExportDeps => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return {
      ffmpeg: bundledFfmpeg(),
      exists: existsSync,
      cancelled: () => cancelled,
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
    }
  }

  const ownedOverlay = (overlay: ExportOverlay | null) => (overlay && isOwnedOverlay(overlay.path, overlaysDir) ? overlay : null)

  ipcMain.handle('export-clips', (event, request: ExportRequest) => {
    cancelled = false
    return exportClips({ ...request, overlay: ownedOverlay(request.overlay) }, exportDeps(event))
  })

  ipcMain.handle('export-frame', (event, request: FrameRequest) => exportFrame({ ...request, input: opened(request.input), overlay: ownedOverlay(request.overlay) }, exportDeps(event)))

  const bundledFfmpeg = () => findFfmpeg(existsSync, bundledFfmpegPath(process.platform, process.resourcesPath, process.execPath), !process.mas)

  ipcMain.handle('thumbnail', async (_event, path: string, time: number) => {
    const jpeg = await captureFfmpeg(bundledFfmpeg()!, thumbnailArgs(opened(path), time, THUMBNAIL_HEIGHT))
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`
  })

  ipcMain.handle('frame-rate', async (_event, path: string) =>
    parseFrameRate(await readFfmpegInfo(bundledFfmpeg()!, opened(path))) ?? DEFAULT_FRAME_RATE
  )

  let lastWaveform: { path: string; peaks: Promise<Float32Array> } | null = null
  const readWaveform = async (path: string) => {
    const raw = await captureFfmpeg(bundledFfmpeg()!, waveformArgs(opened(path)))
    const even = raw.byteLength - (raw.byteLength % 2)
    return peaksFromSamples(new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + even)))
  }
  ipcMain.handle('waveform', (_event, path: string) => {
    if (lastWaveform?.path !== path) {
      const peaks = readWaveform(path)
      peaks.catch(() => {
        if (lastWaveform?.peaks === peaks) lastWaveform = null
      })
      lastWaveform = { path, peaks }
    }
    return lastWaveform.peaks
  })

  ipcMain.handle('load-session', (_event, videoPath: string) => loadSession(sessionsDir, videoPath))
  ipcMain.on('save-session', (_event, videoPath: string, session: Session) => void saveSession(sessionsDir, videoPath, session))

  const exists = (entry: RecentEntry) => {
    const stop = entry.bookmark ? (app.startAccessingSecurityScopedResource(entry.bookmark) as () => void) : undefined
    try {
      return existsSync(entry.path)
    } finally {
      stop?.()
    }
  }
  ipcMain.handle('recent-videos', async () => {
    const recents = (await loadRecents(recentsFile)).filter(exists)
    return Promise.all(
      recents.map(async (entry) =>
        toRecentVideo(
          entry,
          (await loadSession(sessionsDir, entry.path))?.clips.length ?? 0,
          await readPoster(posterFile(postersDir, entry.path))
        )
      )
    )
  })
  ipcMain.handle('open-recent', async (_event, path: string) => {
    const entry = (await loadRecents(recentsFile)).find((recent) => recent.path === path)
    if (!entry) return null
    if (entry.bookmark) app.startAccessingSecurityScopedResource(entry.bookmark)
    if (!existsSync(path)) {
      await forgetRecent(recentsFile, path)
      return null
    }
    allowVideo(path, entry.bookmark)
    return path
  })

  ipcMain.handle('movies-dir', () => realpath(app.getPath('videos')).catch(() => app.getPath('videos')))

  ipcMain.on('share', (event, files: string[]) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined
    new ShareMenu({ filePaths: files }).popup({ window: win })
  })

  ipcMain.on('reveal', (_event, path: string) => shell.showItemInFolder(path))

  const win = createWindow()
  win.webContents.once('did-finish-load', () => {
    sendPath = (path) => {
      allowVideo(path)
      const target = mainWindow()
      if (!target) return
      if (target.isMinimized()) target.restore()
      target.focus()
      target.webContents.send('open-path', path)
    }
    pendingPaths.splice(0).forEach(sendPath)
  })
  if (updates) {
    autoUpdater.on('update-downloaded', ({ version }) => mainWindow()?.webContents.send('update-ready', version))
    ipcMain.on('restart-to-update', () => autoUpdater.quitAndInstall())
    win.webContents.once('did-finish-load', checkInBackground)
    setInterval(checkInBackground, UPDATE_CHECK_INTERVAL_MS)
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', stopAllFfmpeg)
app.on('window-all-closed', () => app.quit())
