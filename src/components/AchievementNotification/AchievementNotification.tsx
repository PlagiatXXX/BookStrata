import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Achievement {
  title: string;
  description: string;
  xpValue: number;
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement]);

  return (
    <AnimatePresence onExitComplete={onClose}>
      {isVisible && achievement ? (
        <motion.div
          key="notification"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-9999 flex max-w-sm items-center gap-4 rounded-2xl border-2 border-yellow-400 bg-[#1a1a2e] p-5 shadow-[0_0_30px_rgba(234,179,8,0.2)] overflow-hidden"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            <Trophy size={32} className="text-[#1a1a2e]" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                Достижение получено!
              </span>
            </div>
            <h4 className="text-lg font-black text-white">{achievement.title}</h4>
            <p className="text-sm text-gray-400">{achievement.description}</p>
            <div className="mt-2 inline-block rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-bold text-yellow-400">
              +{achievement.xpValue} XP
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-white cursor-pointer"
            aria-label="Закрыть уведомление"
          >
            <X size={16} />
          </button>
          {/* Progress bar */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-yellow-400/50"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
