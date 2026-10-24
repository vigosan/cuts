import { describe, expect, it, vi } from 'vitest'
import { messagesFor } from '../shared/i18n'
import { menuTemplate, type MenuEntry } from './menu'

const flatten = (entries: MenuEntry[]): MenuEntry[] => entries.flatMap((e) => [e, ...flatten(e.submenu ?? [])])

describe('menuTemplate', () => {
  it('ships no developer tools or reload items, which do not belong in a release build', () => {
    const roles = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {} })).map((e) => e.role)
    expect(roles).not.toContain('toggleDevTools')
    expect(roles).not.toContain('reload')
    expect(roles).not.toContain('forceReload')
  })

  it('keeps the edit commands so copy and paste work in the file name field', () => {
    const roles = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo: () => {} })).map((e) => e.role)
    expect(roles).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll', 'quit']))
  })

  it('labels every item in the user language', () => {
    const labels = flatten(menuTemplate(messagesFor('es'), 'Cuts', { openVideo: () => {} }))
      .filter((e) => e.type !== 'separator')
      .map((e) => e.label)
    expect(labels).toContain('Salir de Cuts')
    expect(labels).toContain('Edición')
    expect(labels.every(Boolean)).toBe(true)
  })

  it('opens another video from File > Open Video… with Command-O, the usual place on macOS', () => {
    const openVideo = vi.fn()
    const item = flatten(menuTemplate(messagesFor('en'), 'Cuts', { openVideo })).find((e) => e.label === 'Open Video…')!
    expect(item.accelerator).toBe('CmdOrCtrl+O')
    ;(item.click as () => void)()
    expect(openVideo).toHaveBeenCalled()
  })
})
