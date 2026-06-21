import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Work from '@/components/sections/Work'
import Coding from '@/components/sections/Coding'
import Skills from '@/components/sections/Skills'
import Achievements from '@/components/sections/Achievements'
import Contact from '@/components/sections/Contact'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Work />
      <Coding />
      <Skills />
      <Achievements />
      <Contact />
      <Footer />
    </main>
  )
}
