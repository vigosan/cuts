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
  reveal: (path) => ipcRenderer.send('reveal', path)
}

contextBridge.exposeInMainWorld('api', api)
