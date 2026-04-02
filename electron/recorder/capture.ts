import { desktopCapturer } from "electron"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let sessionDir: string | null = null

export function initSessionDir(sessionId: string): string {
  sessionDir = path.join(os.tmpdir(), "basics-recordings", sessionId)
  fs.mkdirSync(sessionDir, { recursive: true })
  return sessionDir
}

export function getSessionDir(): string | null {
  return sessionDir
}

export function cleanupSessionDir(): void {
  if (sessionDir && fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
  }
  sessionDir = null
}

export async function captureScreenshot(sessionId: string): Promise<string> {
  const dir = sessionDir || initSessionDir(sessionId)
  const filename = `${Date.now()}.png`
  const filepath = path.join(dir, filename)

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 },
  })

  if (sources.length === 0) {
    throw new Error("No screen sources available")
  }

  const png = sources[0].thumbnail.toPNG()
  fs.writeFileSync(filepath, png)

  return filepath
}
