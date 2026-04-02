import { app, BrowserWindow, shell } from "electron"
import * as path from "path"

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#F9F7F4",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Show splash while loading
  const splashPath = path.join(__dirname, "..", "electron", "splash.html")
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
  })
  splash.loadFile(splashPath)

  const url = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "..", ".next", "standalone", "server.js")}`

  if (isDev) {
    mainWindow.loadURL(url)
  } else {
    // In production, start the Next.js standalone server
    mainWindow.loadURL("http://localhost:3000")
  }

  mainWindow.once("ready-to-show", () => {
    splash.destroy()
    mainWindow?.show()
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url)
    }
    return { action: "deny" }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})
