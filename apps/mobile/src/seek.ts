import type { VideoPlayer } from 'expo-video'

export function seek(player: VideoPlayer, time: number, duration: number): void {
  player.currentTime = Math.min(duration, Math.max(0, time))
}
