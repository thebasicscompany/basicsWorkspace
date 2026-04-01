export function WorkspaceMain({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ marginLeft: 68 }}
    >
      {children}
    </main>
  )
}
