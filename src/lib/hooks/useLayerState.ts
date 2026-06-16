'use client'

import { createContext, useContext } from 'react'

export type Layer = 1 | 2 | 3

export interface LayerState {
  currentLayer: Layer
  setCurrentLayer: (layer: Layer) => void
  hasVisitedCore: boolean
  setHasVisitedCore: (visited: boolean) => void
}

export const LayerContext = createContext<LayerState>({
  currentLayer: 1,
  setCurrentLayer: () => {},
  hasVisitedCore: false,
  setHasVisitedCore: () => {},
})

export const useLayerState = () => useContext(LayerContext)
