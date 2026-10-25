const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')
const [screenshot, tagline, outPath] = process.argv.slice(-3)
const fileUrl = (file) => `file://${path.resolve(file)}`
const icon = fileUrl(path.join(__dirname, '../apps/web/public/icon.png'))
const html = `<html><body style="margin:0;width:1200px;height:630px;overflow:hidden;background:#fff;font-family:ui-monospace,Menlo,monospace">
  <div style="position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;gap:28px">
    <div style="display:flex;align-items:center;gap:20px"><img src="${icon}" width="88" height="88"><span style="font-size:44px;font-weight:500;color:#1f2937;letter-spacing:1px">Cuts</span></div>
    <div style="font-size:34px;line-height:1.3;color:#1f2937">${tagline}</div>
    <div style="font-size:20px;color:#6b7280">Mac · Windows · Linux</div>
  </div>
  <img src="${fileUrl(screenshot)}" style="position:absolute;left:600px;top:95px;width:800px;border-radius:14px;box-shadow:0 30px 70px -20px rgba(0,0,0,.35);outline:1px solid rgba(0,0,0,.06)">
</body></html>`
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 630, show: false, webPreferences: { offscreen: true } })
  win.setContentSize(1200, 630)
  const page = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cuts-og-')), 'og.html')
  fs.writeFileSync(page, html)
  await win.loadFile(page)
  await new Promise((r) => setTimeout(r, 500))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1200, height: 630 })
  fs.writeFileSync(outPath, img.resize({ width: 1200, height: 630 }).toPNG())
  app.quit()
})
