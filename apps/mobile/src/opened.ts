import type { AssetInfo } from './media'

const opened = new Map<string, AssetInfo>()

export const rememberOpened = (asset: AssetInfo) => void opened.set(asset.id, asset)

export const openedAsset = (id: string) => opened.get(id) ?? null
