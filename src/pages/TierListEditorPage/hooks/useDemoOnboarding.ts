import { useCallback, useEffect, useState } from "react";

/** Ключ флага «онбординг демо-режима уже показан» в localStorage */
const DEMO_ONBOARDING_SEEN_KEY = "bookstrata_demo_onboarding_seen";

export interface UseDemoOnboardingResult {
  /** Текущий шаг тура; null — тур скрыт */
  step: 0 | 1 | 2 | 3 | null;
  /** Перейти к следующему шагу (на последнем шаге — закрыть тур) */
  next: () => void;
  /** Закрыть тур (пользователь сам отказался от тура через UI) */
  skip: () => void;
}

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(DEMO_ONBOARDING_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Онбординг демо-режима: показывается ОДИН раз на браузер.
 *
 * Раньше тур стартовал на каждой загрузке демо-страницы (/new анонимно),
 * поэтому после закрытия и возврата в демо-режим он появлялся снова.
 * Теперь факт показа хранится в localStorage, и повторный показ
 * не происходит, пока флаг не будет сброшен.
 */
export function useDemoOnboarding(isDemo: boolean): UseDemoOnboardingResult {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | null>(() => {
    if (!isDemo) return null;
    if (hasSeenOnboarding()) return null;
    return 0;
  });

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(DEMO_ONBOARDING_SEEN_KEY, "1");
    } catch {
      // localStorage может быть недоступен — тогда тур покажется снова, это допустимо
    }
  }, []);

  // Тур показан — помечаем просмотренным сразу, чтобы при следующем
  // заходе в демо-режим он не появлялся повторно
  useEffect(() => {
    if (step !== null) markSeen();
  }, [step, markSeen]);

  const next = useCallback(() => {
    setStep((prev) => {
      if (prev === null || prev >= 3) return null;
      return (prev + 1) as 0 | 1 | 2 | 3 | null;
    });
  }, []);

  const skip = useCallback(() => {
    setStep(null);
  }, []);

  return { step, next, skip };
}