export function openFileBatch(delayMs: number) {
  const pending: string[] = []
  let send: ((paths: string[]) => void) | null = null
  let timer: NodeJS.Timeout | undefined
  const schedule = () => {
    if (!send || pending.length === 0) return
    clearTimeout(timer)
    timer = setTimeout(() => send?.(pending.splice(0)), delayMs)
  }
  return {
    add(path: string) {
      pending.push(path)
      schedule()
    },
    ready(sender: (paths: string[]) => void) {
      send = sender
      schedule()
    }
  }
}
