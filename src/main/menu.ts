import type { MenuItemConstructorOptions } from 'electron'
import type { Messages } from '../shared/i18n'

export type MenuEntry = Omit<MenuItemConstructorOptions, 'submenu'> & { submenu?: MenuEntry[] }

const separator: MenuEntry = { type: 'separator' }

export type MenuActions = { openVideo: () => void }

export function menuTemplate(t: Messages, appName: string, actions: MenuActions): MenuEntry[] {
  return [
    {
      label: appName,
      submenu: [
        { role: 'about', label: t.menuAbout(appName) },
        separator,
        { role: 'services', label: t.menuServices },
        separator,
        { role: 'hide', label: t.menuHide(appName) },
        { role: 'hideOthers', label: t.menuHideOthers },
        { role: 'unhide', label: t.menuShowAll },
        separator,
        { role: 'quit', label: t.menuQuit(appName) }
      ]
    },
    {
      label: t.menuFile,
      submenu: [{ label: t.menuOpenVideo, accelerator: 'CmdOrCtrl+O', click: actions.openVideo }]
    },
    {
      label: t.menuEdit,
      submenu: [
        { role: 'undo', label: t.menuUndo },
        { role: 'redo', label: t.menuRedo },
        separator,
        { role: 'cut', label: t.menuCut },
        { role: 'copy', label: t.menuCopy },
        { role: 'paste', label: t.menuPaste },
        { role: 'selectAll', label: t.menuSelectAll }
      ]
    },
    {
      label: t.menuWindow,
      submenu: [
        { role: 'minimize', label: t.menuMinimize },
        { role: 'zoom', label: t.menuZoom },
        separator,
        { role: 'close', label: t.menuClose }
      ]
    }
  ]
}
