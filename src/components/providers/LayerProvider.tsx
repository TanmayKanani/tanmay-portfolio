'use client'

import { useState, type ReactNode } from 'react'
import { LayerContext, type Layer } from '@/lib/hooks/useLayerState'

export default function LayerProvider({ children }: { children: ReactNode }) {
  const [currentLayer, setCurrentLayer] = useState<Layer>(1)
  const [hasVisitedCore, setHasVisitedCore] = useState(false)

  return (
    <LayerContext.Provider value={{ currentLayer, setCurrentLayer, hasVisitedCore, setHasVisitedCore }}>
      {children}
    </LayerContext.Provider>
  )
}
