import { useCallback, useState } from "react"
import type { TierListData } from "@/types"
import { DEMO_DATA_VERSION } from "../_initialData"

const DEMO_STORAGE_KEY = "bookstrata_demo_tierlist"

interface DemoStore {
  version: number
  data: TierListData
}

export interface UseDemoStorageResult {
  /** Загрузить демо-черновик из localStorage (null если версия устарела) */
  loadDemo: () => TierListData | null
  /** Сохранить текущее состояние в localStorage */
  saveDemo: (data: TierListData) => void
  /** Очистить демо-черновик после успешного сохранения на сервер */
  clearDemo: () => void
  /** Есть ли сохранённый черновик актуальной версии */
  hasDraft: boolean
}

export function useDemoStorage(): UseDemoStorageResult {
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY)
      if (!raw) return false
      const store = JSON.parse(raw) as DemoStore
      return store.version === DEMO_DATA_VERSION
    } catch {
      return false
    }
  })

  const loadDemo = useCallback((): TierListData | null => {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY)
      if (!raw) return null
      const store = JSON.parse(raw) as DemoStore
      if (store.version !== DEMO_DATA_VERSION) {
        localStorage.removeItem(DEMO_STORAGE_KEY)
        return null
      }
      return store.data as TierListData
    } catch {
      return null
    }
  }, [])

  const saveDemo = useCallback((data: TierListData) => {
    try {
      const store: DemoStore = { version: DEMO_DATA_VERSION, data }
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store))
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
