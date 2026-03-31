// Phase 4 stub — audio extraction from video files
// TODO: Gateway handles audio transcription; this module would handle
// extracting audio tracks from video files before sending to STT providers.

/**
 * Check if a file is a video file based on its MIME type or extension.
 */
export function isVideoFile(fileNameOrMime: string): boolean {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v']
  const videoMimes = [
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-matroska',
    'video/webm',
    'video/x-flv',
    'video/x-ms-wmv',
  ]

  const lower = fileNameOrMime.toLowerCase()
  if (videoMimes.includes(lower)) return true
  return videoExtensions.some((ext) => lower.endsWith(ext))
}

/**
 * Extract the audio track from a video file buffer.
 * Phase 4 stub: throws — requires ffmpeg or similar binary.
 */
export async function extractAudioFromVideo(
  videoBuffer: Buffer,
  _mimeType?: string
): Promise<Buffer> {
  throw new Error(
    `Audio extraction from video not implemented (Phase 4). ` +
      `Video buffer size: ${videoBuffer.length} bytes. ` +
      `Requires ffmpeg or a cloud transcoding service.`
  )
}
