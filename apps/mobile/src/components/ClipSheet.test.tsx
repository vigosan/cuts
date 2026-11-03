import { render, screen } from '@testing-library/react-native'
import { Segments } from './ClipSheet'
import { palettes } from '../theme'

const theme = palettes.light

it('both segments keep an opaque background, because iOS does not repaint a switch to transparent', async () => {
  await render(<Segments theme={theme} prefix="framing" value="crop" options={[['crop', 'Crop'], ['fit', 'Fit']]} onChange={jest.fn()} />)
  expect(screen.getByTestId('framing-crop')).toHaveStyle({ backgroundColor: theme.card })
  expect(screen.getByTestId('framing-fit')).toHaveStyle({ backgroundColor: theme.fill })
})
