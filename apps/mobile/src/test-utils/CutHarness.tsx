import { act } from '@testing-library/react-native'
import { useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { NativeStackHeaderItem, NativeStackHeaderItemMenuAction } from 'expo-router'
import { EditorProvider } from '../editor/session'
import type { KeyValue } from '../editor/sessions'
import type { AssetInfo } from '../media'
import { ClipSettings } from '../screens/ClipSettings'
import { Cut, type SheetKind } from '../screens/Cut'
import { ExportClips } from '../screens/ExportClips'

export function CutHarness({ asset, store }: { asset: AssetInfo; store: KeyValue }) {
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  return (
    <GestureHandlerRootView>
      <EditorProvider asset={asset} store={store}>
        <Cut onBack={() => {}} onOpenSheet={setSheet} />
        {sheet === 'clip' && <ClipSettings onClose={() => setSheet(null)} />}
        {sheet === 'export' && <ExportClips onClose={() => setSheet(null)} />}
      </EditorProvider>
    </GestureHandlerRootView>
  )
}

type Options = { unstable_headerRightItems?: (props: never) => NativeStackHeaderItem[] }

const headerItems = () => {
  const screens = (globalThis as { __screenOptions?: Options[] }).__screenOptions ?? []
  const latest = [...screens].reverse().find((options) => options.unstable_headerRightItems)
  return latest?.unstable_headerRightItems?.({} as never) ?? []
}

export function headerButton(identifier: string) {
  const item = headerItems().find((candidate) => candidate.type === 'button' && candidate.identifier === identifier)
  if (!item || item.type !== 'button') throw new Error(`no header button ${identifier}`)
  return item
}

export async function pressMenuAction(label: string) {
  const menu = headerItems().find((candidate) => candidate.type === 'menu')
  if (!menu || menu.type !== 'menu') throw new Error('no header menu')
  const action = menu.menu.items.find((item): item is NativeStackHeaderItemMenuAction => item.type === 'action' && item.label === label)
  if (!action) throw new Error(`no menu action ${label}`)
  await act(async () => action.onPress())
}

export async function pressHeaderButton(identifier: string) {
  await act(async () => headerButton(identifier).onPress())
}
