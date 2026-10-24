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
ws.onopen = async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  const data = { items: [], files: ['/Users/vicent/Movies/2026-10-22 22-33-13.mov'], dragOperationsMask: 1 }
  for (const type of ['dragEnter', 'dragOver', 'drop']) await send('Input.dispatchDragEvent', { type, x: 500, y: 400, data })
  await sleep(2000)
  const seek = (t) => evalJs(`(async () => { const v = document.querySelector('[data-testid=video]'); v.currentTime = ${t}; await new Promise(r => v.onseeked = r) })()`)
  for (const [s, e] of [[584, 643], [1170, 1229], [1855, 1901], [2490, 2549], [3000, 3059], [4100, 4140]]) { await seek(s); await click('mark-start'); await seek(e); await click('mark-end') }
  await click('clip-row-2')
  await select('fade-video', 'white')
  await seek(1196)
  await sleep(800)
  await shot('1-overview')
  await click('zoom-120')
  await seek(1222)
  await sleep(800)
  await shot('2-zoom')
  await click('zoom-all')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await seek(3020)
  await sleep(800)
  await shot('3-dark')
  ws.close()
}
