import 'react-native-gesture-handler/jestSetup'
jest.mock('./modules/cuts-media', () => ({
  __esModule: true,
  default: {
    requestLibraryAccess: jest.fn(async () => 'granted'),
    pickVideo: jest.fn(async () => null),
    pickFile: jest.fn(async () => null),
    pickOverlay: jest.fn(async () => null),
    openAsset: jest.fn(),
    cancelOpen: jest.fn(),
    poster: jest.fn(async () => 'file:///poster.jpg'),
    readPeaks: jest.fn(async () => null),
    thumbnail: jest.fn(async () => 'file:///thumb.jpg'),
    exportClip: jest.fn(),
    cancelExport: jest.fn(),
    saveToCutsAlbum: jest.fn(async () => {}),
    saveFrame: jest.fn(async () => {}),
    addListener: jest.fn(() => ({ remove: jest.fn() }))
  }
}))

jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native')
  const player = {
    currentTime: 0,
    duration: 0,
    playing: false,
    seekTolerance: { toleranceBefore: 0, toleranceAfter: 0 },
    timeUpdateEventInterval: 0,
    play: jest.fn(function (this: { playing: boolean }) {
      this.playing = true
    }),
    pause: jest.fn(function (this: { playing: boolean }) {
      this.playing = false
    }),
    addListener: jest.fn(() => ({ remove: jest.fn() }))
  }
  return { __player: player, useVideoPlayer: () => player, VideoView: View }
})

jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native')
  const none = () => null
  return { Canvas: View, Group: View, Circle: none, Rect: none, RoundedRect: none, Line: none, Image: none, Path: none, useImage: () => null, vec: (x: number, y: number) => ({ x, y }) }
})

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  Stack: {
    Screen: ({ options }: { options?: object }) => {
      const store = globalThis as { __screenOptions?: object[] }
      store.__screenOptions = [...(store.__screenOptions ?? []), options ?? {}]
      return null
    }
  }
}))

beforeEach(() => {
  ;(globalThis as { __screenOptions?: object[] }).__screenOptions = []
})

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' }
}))

