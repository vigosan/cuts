import { palettes } from './theme'

it('in dark mode the primary tile is a soft grey, so a large tile does not glare like white text', () => {
  expect(palettes.dark.tile).not.toBe(palettes.dark.ink)
  expect(palettes.dark.tile).not.toBe('#ffffff')
})

it('in light mode the primary tile keeps the ink black of the other primary buttons', () => {
  expect(palettes.light.tile).toBe(palettes.light.ink)
})
