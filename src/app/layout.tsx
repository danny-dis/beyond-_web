import type { Metadata } from 'next'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Beyond - Web Star Gazing',
  description: 'Explore the night sky from anywhere in the world. Interactive star map with real astronomical data.',
  keywords: ['astronomy', 'stars', 'constellation', 'sky map', 'education', 'stargazing'],
  authors: [{ name: 'Jeff & Danny - Beyond Collaboration' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    apple: '/apple-touch-icon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
      </head>
      <body className="bg-space-deep text-white overflow-hidden font-sans">
        <div id="root" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
