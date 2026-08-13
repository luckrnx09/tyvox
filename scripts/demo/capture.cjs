const { app, BrowserWindow } = require("electron");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const FRAME_MS = 66;
const WIDTH = 1152;
const HEIGHT = 622;

const framesDir = process.argv.at(-1);
if (!framesDir || framesDir.startsWith("-") || framesDir.endsWith(".cjs")) {
  console.error("usage: electron capture.cjs <frames-dir>");
  process.exit(1);
}

mkdirSync(framesDir, { recursive: true });

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    useContentSize: true,
    webPreferences: { offscreen: true },
  });
  win.webContents.setFrameRate(30);
  const page = join(__dirname, "animation.html");
  await win.webContents.loadFile(page, { query: { t: String(Date.now()) } });

  let index = 0;
  const timer = setInterval(async () => {
    const done = await win.webContents.executeJavaScript("window.__done === true");
    if (done) {
      clearInterval(timer);
      console.log("FRAMES", index);
      app.quit();
      return;
    }
    const image = await win.webContents.capturePage();
    writeFileSync(join(framesDir, `frame-${String(index).padStart(5, "0")}.png`), image.toPNG());
    index += 1;
  }, FRAME_MS);
});
