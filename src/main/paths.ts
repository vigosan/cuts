import { dirname } from 'node:path'

export function existingAncestor(path: string, exists: (path: string) => boolean): string {
  let current = path
  while (!exists(current) && dirname(current) !== current) current = dirname(current)
  return current
}
