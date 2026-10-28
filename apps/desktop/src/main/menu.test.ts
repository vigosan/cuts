import { describe, expect, it, vi } from 'vitest'
import { messagesFor } from '@cuts/core/i18n'
import { menuTemplate, type MenuEntry } from './menu'

const flatten = (entries: MenuEntry[]): MenuEntry[] => entries.flatMap((e) => [e, ...flatten(e.submenu ?? [])])

describe('menuTemplate', () => {
  it('ships no developer tools or reload items, which do not belong in a release build', () => {
    const roles = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} })).map((e) => e.role)
    expect(roles).not.toContain('toggleDevTools')
    expect(roles).not.toContain('reload')
    expect(roles).not.toContain('forceReload')
  })

  it('keeps the edit commands so copy and paste work in the file name field', () => {
    const roles = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} })).map((e) => e.role)
    expect(roles).toEqual(expect.arrayContaining(['cut', 'copy', 'paste', 'selectAll', 'quit']))
  })

  it('labels every item in the user language', () => {
    const labels = flatten(menuTemplate(messagesFor('es'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} }))
      .filter((e) => e.type !== 'separator')
      .map((e) => e.label)
    expect(labels).toContain('Salir de Cuts')
    expect(labels).toContain('Edición')
    expect(labels.every(Boolean)).toBe(true)
  })

  it('opens another video from File > Open Video… with Command-O, the usual place on macOS', () => {
    const openVideo = vi.fn()
    const item = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo, openUrl: () => {}, undo: () => {}, redo: () => {} })).find((e) => e.label === 'Open Video…')!
    expect(item.accelerator).toBe('CmdOrCtrl+O')
    ;(item.click as () => void)()
    expect(openVideo).toHaveBeenCalled()
  })

  it('links the privacy policy and support pages from the Help menu, which App Review requires inside the app', () => {
    const openUrl = vi.fn()
    const items = flatten(menuTemplate(messagesFor('es'), 'Cuts', { openVideo: () => {}, openUrl, undo: () => {}, redo: () => {} }))
    ;(items.find((e) => e.label === 'Política de privacidad')!.click as () => void)()
    ;(items.find((e) => e.label === 'Soporte de Cuts')!.click as () => void)()
    expect(openUrl).toHaveBeenNthCalledWith(1, 'https://cuts.vicent.io/es/privacidad')
    expect(openUrl).toHaveBeenNthCalledWith(2, 'https://cuts.vicent.io/es/soporte')
  })

  it('routes Command-Z and Shift-Command-Z through the app, so they undo clip edits and not only text', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const items = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo, redo }))
    const undoItem = items.find((e) => e.label === 'Undo')!
    const redoItem = items.find((e) => e.label === 'Redo')!
    expect(undoItem.accelerator).toBe('CmdOrCtrl+Z')
    expect(redoItem.accelerator).toBe('Shift+CmdOrCtrl+Z')
    ;(undoItem.click as () => void)()
    ;(redoItem.click as () => void)()
    expect(undo).toHaveBeenCalled()
    expect(redo).toHaveBeenCalled()
  })

  it('leaves out the macOS app menu on Windows and Linux, and quits from the File menu as those systems expect', () => {
    const template = menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} }, 'win32')
    const roles = flatten(template).map((e) => e.role)
    expect(template.map((e) => e.label)).not.toContain('Cuts')
    expect(roles).not.toContain('services')
    expect(roles).not.toContain('hide')
    expect(roles).not.toContain('zoom')
    expect(template.find((e) => e.label === 'File')!.submenu!.map((e) => e.role)).toContain('quit')
  })

  it('offers Check for Updates… under the app menu on macOS, where Mac apps put it', () => {
    const checkForUpdates = vi.fn()
    const template = menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {}, checkForUpdates }, 'darwin')
    const item = template[0].submenu!.find((e) => e.label === 'Check for Updates…')!
    ;(item.click as () => void)()
    expect(checkForUpdates).toHaveBeenCalled()
  })

  it('offers Check for Updates… in the Help menu on Windows and Linux, which have no app menu', () => {
    const template = menuTemplate(messagesFor('es'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {}, checkForUpdates: () => {} }, 'win32')
    expect(template.find((e) => e.label === 'Ayuda')!.submenu!.map((e) => e.label)).toContain('Buscar actualizaciones…')
  })

  it('hides Check for Updates… when the build cannot update itself, as in the App Store', () => {
    const labels = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} })).map((e) => e.label)
    expect(labels).not.toContain('Check for Updates…')
  })

  it('lists recent videos under File > Open Recent on macOS, so a set from yesterday is one click away', () => {
    const file = menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} }, 'darwin')
      .find((e) => e.label === 'File')!
    const recent = file.submenu!.find((e) => e.label === 'Open Recent')!
    expect(recent.role).toBe('recentDocuments')
    expect(recent.submenu!.map((e) => e.role)).toEqual(['clearRecentDocuments'])
  })

  it('leaves out Open Recent on Windows and Linux, where Electron cannot fill it', () => {
    const labels = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {} }, 'win32')).map((e) => e.label)
    expect(labels).not.toContain('Open Recent')
  })

  it('exports the current frame from File with Shift-Command-E, next to Open Video…', () => {
    const exportFrame = vi.fn()
    const item = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {}, exportFrame }))
      .find((e) => e.label === 'Export Current Frame')!
    expect(item.accelerator).toBe('Shift+CmdOrCtrl+E')
    ;(item.click as () => void)()
    expect(exportFrame).toHaveBeenCalled()
  })

  it('opens the keyboard shortcuts from the Help menu, where people look for them', () => {
    const showShortcuts = vi.fn()
    const items = flatten(menuTemplate(messagesFor('es'), 'Cuts', { openVideo: () => {}, openUrl: () => {}, undo: () => {}, redo: () => {}, showShortcuts }))
    ;(items.find((e) => e.label === 'Atajos de teclado')!.click as () => void)()
    expect(showShortcuts).toHaveBeenCalled()
  })
})
