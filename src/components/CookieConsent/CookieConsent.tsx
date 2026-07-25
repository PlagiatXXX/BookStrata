import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "bookstrata-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      // Небольшая задержка, чтобы не перекрывать контент при загрузке
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-4xl rounded-2xl border border-[#2a2a2a] bg-[#121212]/95 backdrop-blur-md p-4 md:p-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <div className="flex-1 text-sm leading-relaxed text-[#b8b1a3]">
                <span className="text-[#f3efe6] font-medium">Используем куки и рекомендательные технологии.</span>{" "}
                Это чтобы сайт работал лучше. Оставаясь с нами, вы соглашаетесь на использование файлов куки.
              </div>
              <button
                onClick={handleAccept}
                className="shrink-0 cursor-pointer rounded-lg bg-[#d94f2b] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#c04424] active:scale-95"
              >
                Хорошо
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
