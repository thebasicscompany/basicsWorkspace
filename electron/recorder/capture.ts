import { desktopCapturer } from "electron"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let sessionDir: string | null = null

// Cache: avoid redundant desktopCapturer.getSources() calls for rapid events
let cachedBuffer: Buffer | null = null
let cachedAt = 0
const CACHE_TTL_MS = 100

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

export async function captureScreenshot(sessionId: string): Promise<{ filepath: string; buffer: Buffer }> {
  const dir = sessionDir || initSessionDir(sessionId)
  const now = Date.now()
  const filename = `${now}.jpg`
  const filepath = path.join(dir, filename)

  let jpeg: Buffer

  // Reuse cached frame if within TTL
  if (cachedBuffer && now - cachedAt < CACHE_TTL_MS) {
    jpeg = cachedBuffer
  } else {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    })

    if (sources.length === 0) {
      throw new Error("No screen sources available")
    }

    jpeg = sources[0].thumbnail.toJPEG(80)
    cachedBuffer = jpeg
    cachedAt = now
  }

  fs.writeFileSync(filepath, jpeg)

  return { filepath, buffer: jpeg }
}
