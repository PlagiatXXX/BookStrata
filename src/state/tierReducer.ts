import type { TierState } from "@/types";

export type TierAction =
  | { type: "RESET"; payload: TierState }
  | { type: "UPDATE"; payload: TierState }
  | { type: "UNDO" }
  | { type: "REDO" }

// Расширенный state с историей
export interface TierHistoryState {
  past: TierState[]
  present: TierState
  future: TierState[]
}

// Редьюсер с undo/redo
export function tierHistoryReducer(
  state: TierHistoryState,
  action: TierAction
): TierHistoryState {
  const { past, present, future } = state

  switch (action.type) {
    case "RESET":
    case "UPDATE":
      return {
        past: [...past, present],
        present: action.payload,
        future: [],
      }
    case "UNDO":
      { if (past.length === 0) return state
      const previous = past[past.length - 1]
      return {
        past: past.slice(0, -1),
        present: previous,
        future: [present, ...future],
      } }
    case "REDO":
      { if (future.length === 0) return state
      const next = future[0]
      return {
        past: [...past, present],
        present: next,
        future: future.slice(1),
      } }
    default:
      return state
  }
}