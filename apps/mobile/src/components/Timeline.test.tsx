import { render, screen } from '@testing-library/react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { formatDuration } from '@cuts/core/clips'
import { Timeline } from './Timeline'

const props = {
  assetId: 'A1',
  duration: 600,
  currentTime: 0,
  peaks: null,
  selectedId: 'long' as string | null,
  snap: (time: number) => time,
  onSeek: jest.fn(),
  onSelect: jest.fn(),
  onDragStart: jest.fn(),
  onDrag: jest.fn()
}

it('over 59 s the selected clip duration turns red, as on the Mac', async () => {
  await render(
    <GestureHandlerRootView>
      <Timeline {...props} clips={[{ id: 'long', start: 0, end: 70 }]} />
    </GestureHandlerRootView>
  )
  const label = screen.getByTestId('clip-duration-long')
  expect(label).toHaveTextContent(formatDuration(70))
  expect(label).toHaveStyle({ color: '#d70015' })
})

it('a carousel-length clip keeps the normal colour', async () => {
  await render(
    <GestureHandlerRootView>
      <Timeline {...props} clips={[{ id: 'long', start: 0, end: 59 }]} />
    </GestureHandlerRootView>
  )
  expect(screen.getByTestId('clip-duration-long')).not.toHaveStyle({ color: '#d70015' })
})

it('while marking, the running length counts and turns red past 59 s', async () => {
  await render(
    <GestureHandlerRootView>
      <Timeline {...props} clips={[]} selectedId={null} pendingStart={100} currentTime={161} />
    </GestureHandlerRootView>
  )
  const label = screen.getByTestId('pending-duration')
  expect(label).toHaveTextContent(formatDuration(61))
  expect(label).toHaveStyle({ color: '#d70015' })
})
