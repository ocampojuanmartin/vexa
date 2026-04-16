import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 canvas-texture">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  )
}
