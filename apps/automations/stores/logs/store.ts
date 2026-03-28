import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LogDetailsUIState } from './types'
import { clampPanelWidth, DEFAULT_LOG_DETAILS_WIDTH } from './utils'

export const useLogDetailsUIStore = create<LogDetailsUIState>()(
  persist(
    (set) => ({
      panelWidth: DEFAULT_LOG_DETAILS_WIDTH,
      setPanelWidth: (width) => {
        set({ panelWidth: clampPanelWidth(width) })
      },
      isResizing: false,
      setIsResizing: (isResizing) => {
        set({ isResizing })
      },
    }),
    {
      name: 'log-details-ui-state',
    }
  )
)
