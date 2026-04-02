import type { CapturedEvent } from "./types"

let events: CapturedEvent[] = []

export function pushEvent(event: CapturedEvent): void {
  events.push(event)
}

export function getEvents(): CapturedEvent[] {
  return [...events]
}

export function getEventCount(): number {
  return events.length
}

export function clearBuffer(): void {
  events = []
}
