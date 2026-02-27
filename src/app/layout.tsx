import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DEET - AI Job Matching Engine',
  description: 'Smart job matching with AI-powered screening',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900">
        {children}
      </body>
    </html>
  )
}
