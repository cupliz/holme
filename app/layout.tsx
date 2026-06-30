import type { Metadata } from 'next'
import './globals.css'
import NavHeader from '@/components/NavHeader'

export const metadata: Metadata = {
  title: 'Holme',
  description: 'Home goods discovery',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavHeader />
        {children}
      </body>
    </html>
  )
}
