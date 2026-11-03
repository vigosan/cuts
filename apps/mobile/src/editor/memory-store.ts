import type { KeyValue } from './sessions'

export function memoryStore(): KeyValue {
  const values = new Map<string, string>()
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key)
  }
}
