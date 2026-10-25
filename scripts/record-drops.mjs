const [, , wsUrl, dir] = process.argv
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
const waitForTimeline = async () => {
  let previous = -1
  for (let i = 0; i < 60; i++) {
    const n = await evalJs(`document.querySelectorAll('[data-testid=filmstrip-frame]').length`)
    if (n > 0 && n === previous) break
    previous = n
    await sleep(700)
  }
}
ws.onopen = async () => {
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  const data = { items: [], files: ['/Users/vicent/Movies/2026-10-22 22-33-13.mov'], dragOperationsMask: 1 }
  for (const type of ['dragEnter', 'dragOver', 'drop']) await send('Input.dispatchDragEvent', { type, x: 500, y: 400, data })
  await sleep(2000)
  await evalJs(`(async () => { const v = document.querySelector('[data-testid=video]'); v.muted = true; v.currentTime = 1396; await new Promise(r => v.onseeked = r) })()`)
  await waitForTimeline()
  await sleep(1500)
  const target = await evalJs(`(() => { const r = document.querySelector('[data-testid=suggest]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  await evalJs(`(() => {
    const c = document.createElement('div')
    c.id = 'fake-cursor'
    c.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2v22l6-6 4 9 4-2-4-9h8z" fill="black" stroke="white" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    Object.assign(c.style, { position: 'fixed', left: '1150px', top: '560px', zIndex: 99999, pointerEvents: 'none', transition: 'left 0.9s cubic-bezier(.4,0,.2,1), top 0.9s cubic-bezier(.4,0,.2,1), transform 0.12s' })
    document.body.appendChild(c)
    document.querySelector('[data-testid=video]').play()
  })()`)
  await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
  await sleep(900)
  await evalJs(`(() => { const c = document.getElementById('fake-cursor'); c.style.left = '${target.x - 3}px'; c.style.top = '${target.y - 3}px' })()`)
  await sleep(1000)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y })
  await sleep(300)
  await evalJs(`document.getElementById('fake-cursor').style.transform = 'scale(0.85)'`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 })
  await sleep(120)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 })
  await evalJs(`document.getElementById('fake-cursor').style.transform = 'scale(1)'`)
  for (let i = 0; i < 240; i++) {
    if ((await evalJs(`document.querySelectorAll('[data-testid^=clip-row-]').length`)) > 0) break
    await sleep(100)
  }
  await sleep(500)
  await evalJs(`(() => { const c = document.getElementById('fake-cursor'); c.style.left = '1250px'; c.style.top = '640px' })()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1250, y: 640 })
  await sleep(3200)
  await send('Page.stopScreencast')
  await evalJs(`document.querySelector('[data-testid=video]').pause()`)
  await sleep(300)
  fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames))
  console.log(frames.length, 'frames', (frames.at(-1).t - frames[0].t).toFixed(1), 's')
  ws.close()
}
