import type { Metadata } from 'next'
import { EB_Garamond, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import LenisProvider from '@/components/providers/LenisProvider'
import LayerProvider from '@/components/providers/LayerProvider'
import Cursor from '@/components/ui/Cursor'
import GrainCanvas from '@/components/ui/GrainCanvas'

const ebGaramond = EB_Garamond({
  variable: '--font-eb-garamond',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Tanmay Kanani',
  description: 'Computer Science student, competitive programmer, software developer.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <LayerProvider>
          <LenisProvider>
            <Cursor />
            <GrainCanvas />
            {children}
          </LenisProvider>
        </LayerProvider>
      </body>
    </html>
  )
}
