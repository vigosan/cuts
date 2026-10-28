import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import type { Api, ExportProgress } from '../shared/api'

const api: Api = {
  platform: process.platform,
  pathForFile: (file) => {
    const path = webUtils.getPathForFile(file)
    ipcRenderer.sendSync('allow-video', path)
    return path
  },
  openVideo: () => ipcRenderer.invoke('open-video'),
  chooseFolder: (current) => ipcRenderer.invoke('choose-folder', current),
  moviesDir: () => ipcRenderer.invoke('movies-dir'),
  exportClips: (request) => ipcRenderer.invoke('export-clips', request),
  onExportProgress: (callback) => {
    const listener = (_event: IpcRendererEvent, progress: ExportProgress) => callback(progress)
    ipcRenderer.on('export-progress', listener)
    return () => ipcRenderer.removeListener('export-progress', listener)
  },
  reveal: (path) => ipcRenderer.send('reveal', path),
  cancelExport: () => ipcRenderer.send('cancel-export'),
  share: (files) => ipcRenderer.send('share', files),
  thumbnail: (path, time) => ipcRenderer.invoke('thumbnail', path, time),
  waveform: (path) => ipcRenderer.invoke('waveform', path),
  frameRate: (path) => ipcRenderer.invoke('frame-rate', path),
  loadSession: (videoPath) => ipcRenderer.invoke('load-session', videoPath),
  saveSession: (videoPath, session) => ipcRenderer.send('save-session', videoPath, session),
  onMenuCommand: (callback) => {
    const listener = (_event: IpcRendererEvent, command: 'undo' | 'redo') => callback(command)
    ipcRenderer.on('menu-command', listener)
    return () => ipcRenderer.removeListener('menu-command', listener)
  },
  onMenuOpenVideo: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('menu-open-video', listener)
    return () => ipcRenderer.removeListener('menu-open-video', listener)
  },
  onOpenPath: (callback) => {
    const listener = (_event: IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on('open-path', listener)
    return () => ipcRenderer.removeListener('open-path', listener)
  },
  onUpdateReady: (callback) => {
    const listener = (_event: IpcRendererEvent, version: string) => callback(version)
    ipcRenderer.on('update-ready', listener)
    return () => ipcRenderer.removeListener('update-ready', listener)
  },
  restartToUpdate: () => ipcRenderer.send('restart-to-update')
}

contextBridge.exposeInMainWorld('api', api)
