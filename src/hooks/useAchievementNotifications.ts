import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface Achievement {
  title: string;
  description: string;
  xpValue: number;
}

export function useAchievementNotifications() {
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleAchievementEarned = (event: Event) => {
      const customEvent = event as CustomEvent<Achievement>;
      setNewAchievement(customEvent.detail);
      // Инвалидируем статистику и список ачивок
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
    };

    window.addEventListener('achievement-earned', handleAchievementEarned);
    return () => window.removeEventListener('achievement-earned', handleAchievementEarned);
  }, [queryClient]);

  return {
    newAchievement,
    clearNotification: () => setNewAchievement(null)
  };
}

/**
 * Глобальная функция для вызова уведомления из любого места (включая API перехватчики)
 */
export function triggerAchievementNotification(achievement: Achievement) {
  const event = new CustomEvent('achievement-earned', { detail: achievement });
  window.dispatchEvent(event);
}
