import type { GameEvent } from './types'

export const createEventFactory = (startAt: number) => {
  let nextId = startAt

  return <T extends Omit<GameEvent, 'id'>>(event: T): GameEvent => {
    nextId += 1
    return {
      id: nextId,
      ...event,
    } as GameEvent
  }
}
