import { useReducer } from "react"
import { tierHistoryReducer, type TierHistoryState  } from "./tierReducer"
import { mockTierState } from "@/data/mockTierState"

export function useTierState() {
  const [state, dispatch] = useReducer(tierHistoryReducer, {
    past: [],
    present: mockTierState,
    future: [],
  } as TierHistoryState)
  return {
    state,
    dispatch,
  }
}