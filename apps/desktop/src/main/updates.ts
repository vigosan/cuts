export const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000

export function updatesEnabled(env: { packaged: boolean; mas: boolean; windowsStore: boolean }): boolean {
  return env.packaged && !env.mas && !env.windowsStore
}
