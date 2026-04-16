export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center canvas-texture px-4 py-16">
      {children}
    </div>
  )
}
