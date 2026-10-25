const [, , wsUrl, dir, lang] = process.argv
const fs = await import('node:fs')
const ws = new WebSocket(wsUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id) } }
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${dir}/${lang}-${name}.png`, Buffer.from(s.data, 'base64')) }
const select = (testid, value) => evalJs(`(() => { const s = document.querySelector('[data-testid=${testid}]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, '${value}'); s.dispatchEvent(new Event('change', { bubbles: true })) })()`)
const click = (testid) => evalJs(`document.querySelector('[data-testid=${testid}]').click()`)
const waitForTimeline = async () => {
  let previous = -1
  for (let i = 0; i < 60; i++) {
    const frames = await evalJs(`document.querySelectorAll('[data-testid=filmstrip-frame]').length`)
    if (frames > 0 && frames === previous) break
    previous = frames
    await sleep(700)
  }
  await sleep(500)
}
ws.onopen = async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  const data = { items: [], files: ['/Users/vicent/Movies/2026-10-22 22-33-13.mov'], dragOperationsMask: 1 }
  for (const type of ['dragEnter', 'dragOver', 'drop']) await send('Input.dispatchDragEvent', { type, x: 500, y: 400, data })
  await sleep(2000)
  const seek = (t) => evalJs(`(async () => { const v = document.querySelector('[data-testid=video]'); v.currentTime = ${t}; await new Promise(r => v.onseeked = r) })()`)
  await waitForTimeline()
  await click('suggest')
  for (let i = 0; i < 120; i++) {
    if ((await evalJs(`document.querySelector('[data-testid=suggest]').getAttribute('aria-busy')`)) === 'false' && i > 2) break
    await sleep(1000)
  }
  await click('clip-row-3')
  await select('fade-video', 'white')
  await seek(1405)
  await sleep(4000)
  await waitForTimeline()
  await shot('1-overview')
  await click('zoom-120')
  await seek(1430)
  await waitForTimeline()
  await shot('2-zoom')
  await click('zoom-all')
  await select('format', '4:5')
  await click('clip-row-6')
  await seek(2513)
  await waitForTimeline()
  await shot('4-framing')
  await select('format', 'original')
  await evalJs(`document.head.insertAdjacentHTML('beforeend', '<style>*{transition:none!important}</style>')`)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await seek(3115)
  await waitForTimeline()
  await shot('3-dark')
  ws.close()
}
