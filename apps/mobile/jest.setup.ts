jest.mock('./modules/cuts-media', () => ({
  __esModule: true,
  default: {
    requestLibraryAccess: jest.fn(async () => 'granted'),
    pickVideo: jest.fn(async () => null),
    openAsset: jest.fn(),
    readPeaks: jest.fn(async () => null),
    thumbnail: jest.fn(async () => 'file:///thumb.jpg'),
    exportClip: jest.fn(),
    cancelExport: jest.fn(),
    saveToCutsAlbum: jest.fn(async () => {}),
    saveFrame: jest.fn(async () => {}),
    addListener: jest.fn(() => ({ remove: jest.fn() }))
  }
}))
