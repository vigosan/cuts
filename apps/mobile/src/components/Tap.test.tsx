import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Tap } from './Tap'

it('a button dims gently the moment the finger lands, not when it lifts, and stays readable', async () => {
  await render(
    <Tap testID="button" testOnly_pressed onPress={jest.fn()} style={{ backgroundColor: 'black' }}>
      <Text>Go</Text>
    </Tap>
  )
  expect(screen.getByTestId('button')).toHaveStyle({ opacity: 0.7, backgroundColor: 'black' })
})

it('a resting button is fully opaque', async () => {
  await render(
    <Tap testID="button" onPress={jest.fn()}>
      <Text>Go</Text>
    </Tap>
  )
  expect(screen.getByTestId('button')).toHaveStyle({ opacity: 1 })
})

it('a big button also sinks a little under the finger, like an iOS card', async () => {
  await render(
    <Tap testID="button" testOnly_pressed shrink onPress={jest.fn()}>
      <Text>Go</Text>
    </Tap>
  )
  expect(screen.getByTestId('button')).toHaveStyle({ transform: [{ scale: 0.97 }] })
})
