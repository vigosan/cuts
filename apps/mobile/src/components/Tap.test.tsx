import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Tap } from './Tap'

it('a button dims the moment the finger lands, not when it lifts', async () => {
  await render(
    <Tap testID="button" testOnly_pressed onPress={jest.fn()} style={{ backgroundColor: 'black' }}>
      <Text>Go</Text>
    </Tap>
  )
  expect(screen.getByTestId('button')).toHaveStyle({ opacity: 0.55, backgroundColor: 'black' })
})

it('a resting button is fully opaque', async () => {
  await render(
    <Tap testID="button" onPress={jest.fn()}>
      <Text>Go</Text>
    </Tap>
  )
  expect(screen.getByTestId('button')).toHaveStyle({ opacity: 1 })
})
