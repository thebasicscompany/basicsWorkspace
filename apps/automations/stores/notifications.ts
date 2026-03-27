import { create } from 'zustand'

/**
 * Stub notification store — matches Sim's interface for compatibility.
 * Full notification UI is a future feature.
 */

interface Notification {
  id: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  workflowId?: string
  action?: {
    type: string
    message: string
  }
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = crypto.randomUUID()
    set((state) => ({
      notifications: [{ ...notification, id }, ...state.notifications],
    }))
    // Auto-dismiss after 5s
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    }, 5000)
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },
  clearAll: () => set({ notifications: [] }),
}))
