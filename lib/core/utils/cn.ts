import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Stub icon component — Blimp is used in mothership.ts block
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Blimp: any = () => null
