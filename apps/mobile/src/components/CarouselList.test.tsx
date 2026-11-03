import { render, screen } from '@testing-library/react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { CarouselList } from './CarouselList'

const theme = { background: '#f4f3f1', card: '#ffffff', ink: '#1c1c1e', muted: '#6e6e73', fill: '#e8e7e3', inverse: '#ffffff', danger: '#d70015', accent: '#fde047' }
const clips = [
  { id: 'a', start: 0, end: 59 },
  { id: 'b', start: 100, end: 159 }
]

const renderList = (progress: Record<string, number>) =>
  render(
    <GestureHandlerRootView>
      <CarouselList clips={clips} selectedId={null} progress={progress} theme={theme} onPress={jest.fn()} onReorder={jest.fn()} />
    </GestureHandlerRootView>
  )

it('an exported clip gets a check, not a grey row that hides its length', async () => {
  await renderList({ a: 1, b: 0.4 })
  expect(screen.getByTestId('clip-done-a')).toBeTruthy()
  expect(screen.queryByTestId('clip-done-b')).toBeNull()
  expect(screen.getByTestId('clip-row-a')).toHaveStyle({ backgroundColor: theme.card })
})

it('the clip being exported shows a thin bar along its bottom edge', async () => {
  await renderList({ b: 0.4 })
  expect(screen.getByTestId('clip-progress-b')).toHaveStyle({ width: '40%', height: 3 })
})

it('rows grow with larger text instead of clipping it', async () => {
  await renderList({})
  expect(screen.getByTestId('clip-row-a')).toHaveStyle({ minHeight: 44 })
  expect(screen.getByTestId('clip-row-a')).not.toHaveStyle({ height: 36 })
})
