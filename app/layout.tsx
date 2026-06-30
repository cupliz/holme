import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Holme',
  description: 'Home goods discovery',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 bg-white border-b border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
              Holme
            </a>
            <nav className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
              <a
                href="/search"
                className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors text-neutral-600 hover:text-neutral-900 hover:bg-white"
              >
                Search
              </a>
              <a
                href="/ai-search"
                className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors text-neutral-400 cursor-not-allowed"
                title="Coming soon"
              >
                AI Search
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
