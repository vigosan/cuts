import * as Haptics from 'expo-haptics'

const quietly = (feedback: Promise<void>) => void feedback.catch(() => {})

export const haptics = {
  tick: () => quietly(Haptics.selectionAsync()),
  mark: () => quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  lift: () => quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  drop: () => quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  failure: () => quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
}
