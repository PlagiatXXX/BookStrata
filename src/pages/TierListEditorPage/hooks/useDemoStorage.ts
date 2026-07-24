import { useCallback, useState } from "react"
import type { TierListData } from "@/types"

const DEMO_STORAGE_KEY = "bookstrata_demo_tierlist"

export interface UseDemoStorageResult {
  /** Загрузить демо-черновик из localStorage */
  loadDemo: () => TierListData | null
  /** Сохранить текущее состояние в localStorage */
  saveDemo: (data: TierListData) => void
  /** Очистить демо-черновик после успешного сохранения на сервер */
  clearDemo: () => void
  /** Есть ли сохранённый черновик */
  hasDraft: boolean
}

export function useDemoStorage(): UseDemoStorageResult {
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return localStorage.getItem(DEMO_STORAGE_KEY) !== null
    } catch {
      return false
    }
  })

  const loadDemo = useCallback((): TierListData | null => {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as TierListData
    } catch {
      return null
    }
  }, [])

  const saveDemo = useCallback((data: TierListData) => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data))
      setHasDraft(true)
    } catch {
      // localStorage может быть переполнен — игнорируем
    }
  }, [])

  const clearDemo = useCallback(() => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY)
      setHasDraft(false)
    } catch {
      // ignore
    }
  }, [])

  return { loadDemo, saveDemo, clearDemo, hasDraft }
}
