const [, , wsUrl, dir, scheme, audio, cover] = process.argv
const fs = await import('node:fs')
fs.mkdirSync(dir, { recursive: true })
const ws = new WebSocket(wsUrl)
let id = 0
const pending = new Map()
const frames = []
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.method === 'Page.screencastFrame') {
    const name = `${dir}/f${String(frames.length).padStart(5, '0')}.png`
    fs.writeFileSync(name, Buffer.from(d.params.data, 'base64'))
    frames.push({ name, t: d.params.metadata.timestamp })
    send('Page.screencastFrameAck', { sessionId: d.params.sessionId })
    return
  }
  if (pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id) }
}
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const centre = (testid) => evalJs(`(() => { const r = document.querySelector('[data-testid=${testid}]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
const drop = async (file, at) => {
  const data = { items: [], files: [file], dragOperationsMask: 1 }
  for (const type of ['dragEnter', 'dragOver', 'drop']) await send('Input.dispatchDragEvent', { type, x: at.x, y: at.y, data })
}
const moveTo = async (at) => {
  await evalJs(`(() => { const c = document.getElementById('fake-cursor'); c.style.left = '${at.x - 3}px'; c.style.top = '${at.y - 3}px' })()`)
  await sleep(600)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y })
  await sleep(120)
}
const press = (down) => evalJs(`document.getElementById('fake-cursor').style.transform = 'scale(${down ? 0.85 : 1})'`)
const clickAt = async (at) => {
  await moveTo(at)
  await press(true)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 })
  await sleep(120)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 })
  await press(false)
}
ws.onopen = async () => {
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
  await drop(audio, { x: 500, y: 400 })
  for (let i = 0; i < 120; i++) {
    if (await evalJs(`!!document.querySelector('[data-testid=waveform]') && !document.querySelector('[data-testid=waveform-loading]')`)) break
    await sleep(500)
  }
  await evalJs(`document.querySelector('[data-testid=extras-waveform]').click()`)
  await sleep(300)
  await evalJs(`(() => { const s = document.querySelector('[data-testid=extras-opacity]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, '0.8'); s.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await evalJs(`document.querySelector('[data-testid=extras-waveform]').click()`)
  await evalJs(`(async () => { const v = document.querySelector('[data-testid=video]'); v.muted = true; v.currentTime = 20; await new Promise(r => v.onseeked = r) })()`)
  await sleep(800)
  await evalJs(`(() => {
    const c = document.createElement('div')
    c.id = 'fake-cursor'
    c.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2v22l6-6 4 9 4-2-4-9h8z" fill="black" stroke="white" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    Object.assign(c.style, { position: 'fixed', left: '900px', top: '520px', zIndex: 99999, pointerEvents: 'none', transition: 'left 0.55s cubic-bezier(.4,0,.2,1), top 0.55s cubic-bezier(.4,0,.2,1), transform 0.12s' })
    document.body.appendChild(c)
  })()`)
  await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
  await sleep(700)
  const row = await centre('background-row')
  await moveTo(row)
  await press(true)
  await sleep(120)
  await press(false)
  await drop(cover, row)
  await sleep(600)
  await clickAt(await centre('extras-waveform'))
  await sleep(300)
  const wave = await centre('wave')
  await moveTo(wave)
  await press(true)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: wave.x, y: wave.y, button: 'left', clickCount: 1 })
  await evalJs(`document.getElementById('fake-cursor').style.transition = 'transform 0.12s'`)
  for (let step = 1; step <= 10; step++) {
    const y = wave.y + step * 5
    await evalJs(`document.getElementById('fake-cursor').style.top = '${y - 3}px'`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: wave.x, y, button: 'left', buttons: 1 })
    await sleep(25)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: wave.x, y: wave.y + 50, button: 'left', clickCount: 1 })
  await press(false)
  await evalJs(`document.getElementById('fake-cursor').style.transition = 'left 0.55s cubic-bezier(.4,0,.2,1), top 0.55s cubic-bezier(.4,0,.2,1), transform 0.12s'`)
  await sleep(300)
  await clickAt(await centre('extras-progress'))
  await sleep(300)
  await clickAt(await centre('play'))
  await moveTo({ x: 900, y: 640 })
  await sleep(4500)
  await send('Page.stopScreencast')
  await evalJs(`document.querySelector('[data-testid=video]').pause()`)
  await sleep(300)
  fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames))
  console.log(frames.length, 'frames', (frames.at(-1).t - frames[0].t).toFixed(1), 's')
  ws.close()
}
