import { useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "motion/react"
import { ArrowLeft, Heart, Send } from "lucide-react"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Highlighter } from "@/components/ui/highlighter"
import { HanddrawnSmiley } from "@/components/ui/handdrawn-smiley"
import { Pointer } from "@/components/ui/pointer"

export default function HistoryPage() {
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }, [navigate])

  return (
    <div className="min-h-screen" style={{ background: "#0b1620", color: "#e2e8f0" }}>
      <SEOHead
        title="История проекта BookStrata"
        description="Как появился BookStrata — история создания социальной сети для читателей. Личный рассказ основателя проекта."
        url="/history"
      />

      {/* ======== ОБЪЕДИНЁННЫЙ HERO + КОНТЕНТ ======== */}
      <section className="relative overflow-hidden pt-16 md:pt-20 pb-16 md:pb-24 px-4">
        {/* Градиентный фон */}
        <div className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.12) 0%, transparent 70%), radial-gradient(ellipse at 70% 50%, rgba(6,188,249,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/70 text-sm mb-8 border border-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              На главную
            </Link>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6"
            style={{ color: "#e2e8f0" }}
          >
            История проекта
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "#94a3b8" }}
          >
            Как появился BookStrata и почему я решил сделать его — личный рассказ
          </motion.p>
        </div>

        {/* Текст истории */}
        <div className="relative max-w-2xl mx-auto text-center">
          <Pointer>
          <motion.div
            animate={{
              scale: [0.8, 1.15, 0.8],
              rotate: [0, 8, -8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute left-1/2 -translate-x-1/2 -top-4 z-10"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-pink-400 drop-shadow-lg"
            >
              <motion.path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="currentColor"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </svg>
          </motion.div>
        </Pointer>
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <span
            className="block text-[96px] leading-none font-serif mb-[-20px]"
            style={{ color: "rgba(249,115,22,0.25)" }}
          >
            &ldquo;
          </span>

          <div className="text-left">
            <div
              className="text-[1.1rem] leading-[1.8] space-y-5"
              style={{ color: "#cbd5e1" }}
            >
              <p>
                <Highlighter action="box" color="#c97d60" strokeWidth={2} iterations={3} padding={5} animationDuration={800}>
                  BookStrata
                </Highlighter>{' '}
                родился из простой идеи —{' '}
                <Highlighter action="circle" color="#c97d60" strokeWidth={2} iterations={2} padding={4} animationDuration={600}>
                  дать читателям
                </Highlighter>{' '}
                инструмент,
                который не просто собирает книги, а помогает увидеть свой вкус,
                подчерпнуть идеи от других людей и просто{' '}
                <Highlighter action="underline" color="#c97d60" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                  приятно провести время
                </Highlighter>.
              </p>

              <p>
                Идея понятное дело не нова — существует ряд зарубежных аналогов,
                но я взял лучшее, привнес нового и с Вашей помощью готов сделать что-то оригинальное.
              </p>

              <p>
                Я делаю этот проект один,{' '}
                <Highlighter action="underline" color="#b85b3f" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                  вкладываю душу
                </Highlighter>{' '}
                и каждую свободную минуту. Я верю, что могу сделать качественный и
                интересный продукт, который будет полезен мне и остальным пользователям.
              </p>

              <p>
                Здесь нет маркетинговых манипуляций и пустых обещаний — только{' '}
                <Highlighter action="underline" color="#c97d60" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                  искреннее желание
                </Highlighter>{' '}
                сделать{' '}
                <Highlighter action="underline" color="#b85b3f" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                  лучшую социальную сеть для тех, кто любит читать, делиться и вдохновляться
                </Highlighter>.
              </p>

              <p>
                Также есть возможность помочь проекту через донат. Наверное, Вы спросите:
                «Федор, а почему же тогда ты просишь{' '}
                <Highlighter action="crossed-off" color="#ef4444" strokeWidth={2.5} iterations={2} padding={4} animationDuration={600}>
                  кучу денег
                </Highlighter>{' '}
                поддержать донатом?»
                Отвечаю: «это необходимость, чтобы приложение жило и развивалось,
                для меня оно не выходит бесплатным».
              </p>

              <p>
                Для проекта жизненно необходимы Ваши мнения, критика, идеи, предложения,
                замечания. Поэтому буду благодарен обратной связи.
              </p>

              <p>
                Подписывайтесь на наши группы в{' '}
                <a href="https://vk.com/club237287277" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-3 decoration-2" style={{ color: "#fb923c", textDecorationColor: "rgba(251, 146, 60, 0.7)" }}>
                  ВК
                </a>
                {' '}или{' '}
                <a href="https://t.me/bookstrata" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-3 decoration-2" style={{ color: "#fb923c", textDecorationColor: "rgba(251, 146, 60, 0.7)" }}>
                  Telegram
                </a>
                , чтобы не упустить важные новости и обновления!
              </p>

              <p
                className="!text-[1.15rem] !font-medium"
                style={{ color: "#f1f5f9" }}
              >
                <Highlighter action="underline" color="#c97d60" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                  Спасибо, что Вы здесь
                </Highlighter>
                . Вместе мы{' '}
                <Highlighter action="underline" color="#b85b3f" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                  сделаем BookStrata чем-то большим
                </Highlighter>.
              </p>
            </div>

            <div className="relative flex justify-center mt-8">
              <HanddrawnSmiley size={48} />
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-sm" style={{ color: "rgba(249,115,22,0.6)" }}>
              <Heart size={14} />
              Создатель проекта
            </div>
            <div className="mt-1 text-lg font-semibold" style={{ color: "#f3efe6", fontFamily: '"Caveat", "Segoe Script", cursive' }}>
              Фёдор
            </div>
          </div>

          <div className="mt-10 flex justify-center gap-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-colors border border-white/10"
              style={{ background: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
            >
              <ArrowLeft size={18} />
              Вернуться
            </button>
            <a
              href="https://t.me/bookstrata"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors"
              style={{ background: "var(--accent-main)", color: "#fff" }}
            >
              <Send size={18} />
              Наш Telegram
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
