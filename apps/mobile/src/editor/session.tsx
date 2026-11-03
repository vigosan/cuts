import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { randomUUID } from 'expo-crypto'
import { defaultBaseName, MAX_CLIP_SECONDS, type Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import type { OutputFormat } from '@cuts/core/formats'
import { suggestMoments } from '@cuts/core/suggest'
import type { ExportState } from '../components/ExportSheet'
import { haptics } from '../haptics'
import { t } from '../i18n'
import { cancelExport, exportClip, readPeaks, saveToCutsAlbum, type AssetInfo } from '../media'
import { editorReducer, initialEditor, settingsOf, type EditorAction, type EditorState } from './editor'
import { exportJobs } from './export-jobs'
import { runExport } from './export-run'
import { loadPreferences, savePreferences } from './preferences'
import { loadSession, saveSession, touchRecent, type KeyValue } from './sessions'

const SAVE_DELAY_MS = 300
const NOTICE_MS = 5000

export type EditorSession = {
  asset: AssetInfo
  state: EditorState
  dispatch: Dispatch<EditorAction>
  clips: Clip[]
  selectedClip: Clip | null
  shownSettings: ClipSettings
  baseName: string
  setBaseName: (name: string) => void
  format: OutputFormat
  setFormat: (format: OutputFormat) => void
  peaks: Float32Array | null
  suggest: () => Promise<void>
  exportLabel: string
  exporting: ExportState
  progress: Record<string, number>
  startExport: () => Promise<void>
  stopExport: () => void
  resetExport: () => void
  notice: Notice | null
  setNotice: (text: string | null, undo?: boolean) => void
}

export type Notice = { text: string; undo: boolean }

const EditorContext = createContext<EditorSession | null>(null)

export function useEditor(): EditorSession {
  const session = useContext(EditorContext)
  if (!session) throw new Error('useEditor needs an EditorProvider')
  return session
}

export function EditorProvider({ asset, store, children }: { asset: AssetInfo; store: KeyValue; children: ReactNode }) {
  return <EditorContext.Provider value={useEditorSession(asset, store)}>{children}</EditorContext.Provider>
}

function useEditorSession(asset: AssetInfo, store: KeyValue): EditorSession {
  const [preferences] = useState(() => loadPreferences(store))
  const [stored] = useState(() => loadSession(store, asset.id))
  const [state, dispatch] = useReducer(editorReducer, null, () =>
    editorReducer(initialEditor(preferences.settings), { type: 'load', session: stored, defaults: preferences.settings })
  )
  const [baseName, setBaseName] = useState(() => stored?.baseName ?? defaultBaseName(asset.name))
  const [format, setFormatState] = useState(preferences.format)
  const [exporting, setExporting] = useState<ExportState>({ status: 'idle' })
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [peaksRequest] = useState(() => readPeaks(asset.id).catch(() => null))
  const [notice, setNoticeState] = useState<Notice | null>(null)
  const setNotice = useCallback((text: string | null, undo = false) => setNoticeState(text ? { text, undo } : null), [])
  const stopped = useRef(false)
  const clips = state.history.present.clips
  const selectedClip = clips.find((clip) => clip.id === state.selectedId) ?? null

  useEffect(() => {
    void peaksRequest.then(setPeaks)
  }, [peaksRequest])

  useEffect(() => {
    const timer = setTimeout(() => {
      saveSession(store, asset.id, { clips, clipSettings: state.clipSettings, defaultSettings: state.defaultSettings, baseName })
      touchRecent(store, { assetId: asset.id, name: asset.name, duration: asset.duration, clips: clips.length, openedAt: Date.now() })
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [store, asset, clips, state.clipSettings, state.defaultSettings, baseName])

  useEffect(() => savePreferences(store, { settings: state.defaultSettings }), [store, state.defaultSettings])

  useEffect(() => {
    if (exporting.status !== 'running') return
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'background') return
      stopped.current = true
      cancelExport()
    })
    return () => subscription.remove()
  }, [exporting.status])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice, setNotice])

  const resetExport = useCallback(() => {
    setExporting({ status: 'idle' })
    setProgress({})
  }, [])

  const suggest = async () => {
    const found = await peaksRequest
    if (!found) return setNotice(t.suggestNoAudio)
    const existing = clips.filter((clip) => !clip.suggested)
    const moments = suggestMoments({ peaks: found, peaksPerSecond: PEAKS_PER_SECOND, duration: asset.duration, clipLength: MAX_CLIP_SECONDS, existing })
    if (moments.length === 0) return setNotice(t.mobile.suggestNoneFound)
    dispatch({ type: 'suggest', clips: moments.map((moment) => ({ id: randomUUID(), ...moment })) })
    setNotice(t.mobile.momentsAdded(moments.length), true)
  }

  const startExport = async () => {
    const jobs = exportJobs(clips, state.picked, (id) => settingsOf(state, id), format, baseName)
    const ids = jobs.map((job) => clips[job.position].id)
    stopped.current = false
    setProgress({})
    setExporting({ status: 'running', index: 0, total: jobs.length })
    const outcome = await runExport(jobs, {
      exportClip: (job, onProgress) => exportClip(asset.id, job, onProgress),
      saveToCutsAlbum,
      cancelled: () => stopped.current,
      onProgress: (index, ratio) => {
        setExporting({ status: 'running', index, total: jobs.length })
        setProgress((current) => ({ ...current, [ids[index]]: ratio }))
      },
      t
    }).catch((error: Error) => ({ ok: false as const, saved: 0, error: error.message }))
    if (outcome.ok) haptics.success()
    else haptics.failure()
    setExporting({ status: 'done', outcome })
  }

  return {
    asset,
    state,
    dispatch,
    clips,
    selectedClip,
    shownSettings: selectedClip ? settingsOf(state, selectedClip.id) : state.defaultSettings,
    baseName,
    setBaseName,
    format,
    setFormat: (next) => {
      setFormatState(next)
      savePreferences(store, { format: next })
    },
    peaks,
    suggest,
    exportLabel: state.picked?.length ? t.exportSelected(state.picked.length) : t.exportClips(clips.length),
    exporting,
    progress,
    startExport,
    stopExport: () => {
      stopped.current = true
      cancelExport()
    },
    resetExport,
    notice,
    setNotice
  }
}
