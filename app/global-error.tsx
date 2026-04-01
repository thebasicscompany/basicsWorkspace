"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "'Manrope', sans-serif",
          background: "#F9F7F4",
          color: "#18181B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20, lineHeight: 1.5 }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#A1A1AA", marginBottom: 16 }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              fontSize: 13,
              fontWeight: 500,
              background: "#2D8653",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "8px 20px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
