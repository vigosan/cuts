import type { NativeStackHeaderItem } from 'expo-router'
import { t } from '../i18n'

type Actions = { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; onSaveFrame: () => void; exportClip: { number: number; onPress: () => void } | null }

export function cutHeaderItems({ canUndo, canRedo, onUndo, onRedo, onSaveFrame, exportClip }: Actions): NativeStackHeaderItem[] {
  return [
    {
      type: 'menu',
      identifier: 'more',
      label: t.mobile.more,
      icon: { type: 'sfSymbol', name: 'ellipsis' },
      menu: {
        items: [
          ...(exportClip ? [{ type: 'action' as const, label: t.exportClip(exportClip.number), icon: { type: 'sfSymbol' as const, name: 'square.and.arrow.up' as const }, onPress: exportClip.onPress }] : []),
          { type: 'action', label: t.menuRedo, icon: { type: 'sfSymbol', name: 'arrow.uturn.forward' }, disabled: !canRedo, onPress: onRedo },
          { type: 'action', label: t.mobile.saveFrame, icon: { type: 'sfSymbol', name: 'photo' }, onPress: onSaveFrame }
        ]
      }
    },
    { type: 'button', identifier: 'undo', label: t.menuUndo, icon: { type: 'sfSymbol', name: 'arrow.uturn.backward' }, disabled: !canUndo, onPress: onUndo }
  ]
}

export function backItem(onBack: () => void): NativeStackHeaderItem[] {
  return [{ type: 'button', identifier: 'back', label: t.mobile.back, icon: { type: 'sfSymbol', name: 'chevron.backward' }, onPress: onBack }]
}
