import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

export const codeUndoRedoStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null
    try {
      const value = await get<string>(name)
      return value ?? null
    } catch (error) {
      console.warn('[CodeUndoRedoStorage] IndexedDB read failed', { name, error })
      return null
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return
    try {
      await set(name, value)
    } catch (error) {
      console.warn('[CodeUndoRedoStorage] IndexedDB write failed', { name, error })
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return
    try {
      await del(name)
    } catch (error) {
      console.warn('[CodeUndoRedoStorage] IndexedDB delete failed', { name, error })
    }
  },
}
