import Storage from 'expo-sqlite/kv-store'
import type { KeyValue } from './editor/sessions'

export const store: KeyValue = {
  get: (key) => Storage.getItemSync(key),
  set: (key, value) => Storage.setItemSync(key, value),
  remove: (key) => void Storage.removeItemSync(key)
}
