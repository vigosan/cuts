import { render, screen } from '@testing-library/react-native'
import { Segments } from './ClipSheet'

const theme = { background: '#f4f3f1', card: '#ffffff', ink: '#1c1c1e', muted: '#6e6e73', fill: '#e8e7e3', inverse: '#ffffff', danger: '#d70015', accent: '#fde047' }

it('both segments keep an opaque background, because iOS does not repaint a switch to transparent', async () => {
  await render(<Segments theme={theme} prefix="framing" value="crop" options={[['crop', 'Crop'], ['fit', 'Fit']]} onChange={jest.fn()} />)
  expect(screen.getByTestId('framing-crop')).toHaveStyle({ backgroundColor: theme.card })
  expect(screen.getByTestId('framing-fit')).toHaveStyle({ backgroundColor: theme.fill })
})
