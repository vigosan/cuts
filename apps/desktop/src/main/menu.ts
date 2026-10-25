import type { MenuItemConstructorOptions } from 'electron'
import type { Messages } from '@cuts/core/i18n'

export type MenuEntry = Omit<MenuItemConstructorOptions, 'submenu'> & { submenu?: MenuEntry[] }

const separator: MenuEntry = { type: 'separator' }

export type MenuActions = {
  openVideo: () => void
  openUrl: (url: string) => void
  undo: () => void
  redo: () => void
}

export function menuTemplate(t: Messages, appName: string, actions: MenuActions, platform: NodeJS.Platform = process.platform): MenuEntry[] {
  const mac = platform === 'darwin'
  const appMenu: MenuEntry = {
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
  }
  return [
    ...(mac ? [appMenu] : []),
    {
      label: t.menuFile,
      submenu: [
        { label: t.menuOpenVideo, accelerator: 'CmdOrCtrl+O', click: actions.openVideo },
        ...(mac ? [] : [separator, { role: 'quit', label: t.menuQuit(appName) } as MenuEntry])
      ]
    },
    {
      label: t.menuEdit,
      submenu: [
        { label: t.menuUndo, accelerator: 'CmdOrCtrl+Z', click: actions.undo },
        { label: t.menuRedo, accelerator: 'Shift+CmdOrCtrl+Z', click: actions.redo },
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
        ...(mac ? [{ role: 'zoom', label: t.menuZoom } as MenuEntry] : []),
        separator,
        { role: 'close', label: t.menuClose }
      ]
    },
    {
      role: 'help',
      label: t.menuHelp,
      submenu: [
        { label: t.menuPrivacy, click: () => actions.openUrl(t.privacyUrl) },
        { label: t.menuSupport, click: () => actions.openUrl(t.supportUrl) }
      ]
    }
  ]
}
