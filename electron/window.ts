import { BrowserWindow, shell } from "electron"
import * as path from "path"

let mainWindow: BrowserWindow | null = null

const isDev = !require("electron").app.isPackaged

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#F5F7FA",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // __dirname at runtime = electron/dist/
  // splash.html is at electron/splash.html
  const splashPath = path.join(__dirname, "..", "splash.html")
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
  })
  splash.loadFile(splashPath)

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000")
  } else {
    mainWindow.loadURL("http://localhost:3000")
  }

  mainWindow.once("ready-to-show", () => {
    splash.destroy()
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url)
    }
    return { action: "deny" }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  return mainWindow
}
