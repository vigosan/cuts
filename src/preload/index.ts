import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import type { Api, ExportProgress } from '../shared/api'

const api: Api = {
  pathForFile: (file) => webUtils.getPathForFile(file),
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
  thumbnail: (path, time) => ipcRenderer.invoke('thumbnail', path, time),
  waveform: (path) => ipcRenderer.invoke('waveform', path),
  loadSession: (videoPath) => ipcRenderer.invoke('load-session', videoPath),
  saveSession: (videoPath, session) => ipcRenderer.send('save-session', videoPath, session),
  onMenuOpenVideo: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('menu-open-video', listener)
    return () => ipcRenderer.removeListener('menu-open-video', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
