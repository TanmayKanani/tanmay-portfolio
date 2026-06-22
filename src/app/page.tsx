import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import ParallaxWords from '@/components/ui/ParallaxWords'
import Work from '@/components/sections/Work'
import Coding from '@/components/sections/Coding'
import Skills from '@/components/sections/Skills'
import Achievements from '@/components/sections/Achievements'
import Marquee from '@/components/ui/Marquee'
import Contact from '@/components/sections/Contact'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <ParallaxWords />
      <Work />
      <Coding />
      <Skills />
      <Achievements />
      <Marquee
        items={[
          'Software Engineer',
          'Competitive Programmer',
          'Full-stack Builder',
          'Problem Solver',
          'Open to work',
        ]}
      />
      <Contact />
      <Footer />
    </main>
  )
}
