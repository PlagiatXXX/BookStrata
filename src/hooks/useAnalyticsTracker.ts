import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getAuthToken } from '@/lib/authApi'
import { apiTrackEvent } from '@/lib/analyticsApi'

function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

// Минимальный интервал между page_view для одного и того же пути (сек)
const PAGE_VIEW_DEBOUNCE_MS = 10_000

export function useAnalyticsTracker() {
  const { pathname } = useLocation()
  const lastTrackedRef = useRef<{ path: string; time: number } | null>(null)

  // Трекинг просмотра страницы — только для авторизованных,
  // не чаще раза в 10 секунд для одного и того же пути
  useEffect(() => {
    if (!isAuthenticated()) return

    const now = Date.now()
    const last = lastTrackedRef.current

    if (last && last.path === pathname && now - last.time < PAGE_VIEW_DEBOUNCE_MS) {
      return
    }

    lastTrackedRef.current = { path: pathname, time: now }
    apiTrackEvent('page_view', { path: pathname }, window.location.href)
  }, [pathname])
}
