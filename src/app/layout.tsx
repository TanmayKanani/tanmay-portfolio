import type { Metadata } from 'next'
import { EB_Garamond, IBM_Plex_Mono, Geist } from 'next/font/google'
import './globals.css'
import LenisProvider from '@/components/providers/LenisProvider'
import Loader from '@/components/ui/Loader'
import Cursor from '@/components/ui/Cursor'
import Grain from '@/components/ui/Grain'
import ScrollProgress from '@/components/ui/ScrollProgress'
import Nav from '@/components/layout/Nav'
import { site } from '@/lib/data/site'

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

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tanmay-portfolio.vercel.app'),
  title: `${site.name} — ${site.role}`,
  description: site.intro,
  openGraph: {
    title: `${site.name} — Software Engineer & Competitive Programmer`,
    description: site.intro,
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${ibmPlexMono.variable} ${geist.variable}`}
    >
      <body>
        <Loader />
        <div className="atmosphere" aria-hidden="true" />
        <Grain />
        <div className="vignette" aria-hidden="true" />
        <Cursor />
        <ScrollProgress />
        <LenisProvider>
          <Nav />
          <div className="content">{children}</div>
        </LenisProvider>
      </body>
    </html>
  )
}
