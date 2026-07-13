import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { ArrowLeft } from "lucide-react"
import {
  Layers,
  Sword,
  MessageSquare,
  Brain,
  BarChart3,
  Search,
  BookOpen,
  Sparkles,
  Send,
  Pen,
  Share2,
} from "lucide-react"
import { Helmet } from "react-helmet-async"
import { SEOHead } from "@/components/SEO/SEOHead"

/* ---------- Fade-in on scroll wrapper ---------- */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Feature card ---------- */
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  delay: number
}

function FeatureCard({ icon, title, description, gradient, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-lg transition-shadow duration-300"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${gradient} text-white shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  )
}

/* ---------- Main page ---------- */
export default function AboutPage() {
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }, [navigate])

  const features = [
    {
      icon: <Layers size={22} />,
      title: "Создание тир-листов",
      description: "Собирайте книги в наглядные блоки S, A, B, C, D. Настраивайте цвета, обложки, темы и сортируйте в любом порядке.",
      gradient: "bg-linear-to-br from-violet-600 to-purple-600",
    },
    {
      icon: <Sword size={22} />,
      title: "Баттлы",
      description: "Сравнивайте подборки с другими читателями, голосуйте за лучший тир-лист, участвуйте в еженедельных соревнованиях.",
      gradient: "bg-linear-to-br from-orange-500 to-rose-600",
    },
    {
      icon: <MessageSquare size={22} />,
      title: "Обсуждения",
      description: "Комментируйте подборки, общайтесь в чатах, делитесь мнениями и находите единомышленников.",
      gradient: "bg-linear-to-br from-emerald-500 to-teal-600",
    },
    {
      icon: <Brain size={22} />,
      title: "ИИ-библиотекарь",
      description: "Умные рекомендации книг на основе ваших тир-листов и предпочтений. Нейросеть подбирает то, что вам точно понравится.",
      gradient: "bg-linear-to-br from-sky-500 to-indigo-600",
    },
    {
      icon: <BarChart3 size={22} />,
      title: "Профиль и статистика",
      description: "Отслеживайте активность, копите XP, открывайте ачивки, повышайте уровень и находите читателей со схожими интересами.",
      gradient: "bg-linear-to-br from-amber-500 to-orange-600",
    },
    {
      icon: <Search size={22} />,
      title: "Поиск книг",
      description: "Ищите книги по названию, автору или жанру. Добавляйте их в свою коллекцию одним кликом.",
      gradient: "bg-linear-to-br from-pink-500 to-fuchsia-600",
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEOHead
        title="О проекте"
        description="BookStrata — создавайте тир лист книг онлайн, ведите визуальный книжный рейтинг, участвуйте в баттлах и находите книги по вкусу. Узнайте больше о проекте."
        url="/about"
        breadcrumbs={[{ name: "Главная", url: "/" }, { name: "О проекте", url: "/about" }]}
      />

      {/* AboutPage JSON-LD */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "О проекте BookStrata",
            description: "BookStrata — создавайте тир лист книг онлайн, ведите визуальный книжный рейтинг, участвуйте в баттлах и находите книги по вкусу. Узнайте больше о проекте.",
            url: "https://bookstrata.ru/about",
            mainEntity: {
              "@type": "Organization",
              "@id": "https://bookstrata.ru#organization",
            },
          })}
        </script>
      </Helmet>

      {/* ======== HERO ======== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 py-20 md:py-28 px-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-sm mb-8 border border-white/10">
              <Sparkles size={14} />
              Социальная сеть для читателей
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6"
          >
            Твой книжный мир
            <br />
            <span className="bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              в визуальном рейтинге
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            BookStrata — создавай тир-листы книг, участвуй в баттлах, получай
            ИИ-рекомендации и делись своим вкусом с тысячами читателей.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors shadow-xl cursor-pointer"
            >
              <ArrowLeft size={18} />
              Вернуться на сайт
            </button>
            <a
              href="https://t.me/bookstrata"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/10"
            >
              <Send size={18} />
              Наш Telegram
            </a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-16 flex flex-col items-center gap-1 text-white/30"
          >
            <span className="text-xs">Листай дальше</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ======== СТАТИСТИКА ======== */}
      <section className="py-16 md:py-20 px-4 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-12">
              BookStrata в цифрах
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[1, 2, 3, 4].map((_, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black bg-linear-to-br from-violet-600/30 to-fuchsia-600/30 bg-clip-text text-transparent">
                    &infin;
                  </div>
                  <div className="text-sm text-slate-400 mt-1 italic">
                    {["Это только начало", "Скоро", "В процессе", "Stay tuned"][i]}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ======== ВОЗМОЖНОСТИ ======== */}
      <section className="py-16 md:py-20 px-4 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                Все возможности
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Всё, что нужно для визуального книжного рейтинга
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard
                key={i}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
                delay={i * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ======== КАК ЭТО РАБОТАЕТ ======== */}
      <section className="py-16 md:py-20 px-4 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                Как это работает
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Четыре простых шага, чтобы начать
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              {
                icon: <Pen size={24} />,
                number: "01",
                title: "Создай тир-лист",
                desc: "Придумай название, добавь обложку, выбери уникальный фон. Твой рейтинг — твой стиль.",
              },
              {
                icon: <BookOpen size={24} />,
                number: "02",
                title: "Выбери книги",
                desc: "Находи книги из обширной базы через поиск по названию или автору. Всё под рукой.",
              },
              {
                icon: <Layers size={24} />,
                number: "03",
                title: "Расставь по блокам",
                desc: "Перетаскивай книги между блоками S, A, B, C и D. Кастомизируй цвета, названия и порядок.",
              },
              {
                icon: <Share2 size={24} />,
                number: "04",
                title: "Делись и соревнуйся",
                desc: "Публикуй тир-лист, участвуй в баттлах, читай актуальные новости из мира литературы, обсуждай подборки и находи единомышленников.",
              },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="relative bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs hover:shadow-md transition-shadow duration-300">
                  <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-sm font-bold flex items-center justify-center shadow-md">
                    {step.number}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-100 to-fuchsia-100 text-violet-700 flex items-center justify-center mx-auto mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ======== КОНТАКТЫ ======== */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Есть вопросы?
            </h2>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Пишите нам в Telegram — мы всегда на связи
            </p>
          </FadeIn>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="https://t.me/bookstrata"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors shadow-xl"
            >
              <Send size={18} />
              @bookstrata
            </a>
          </motion.div>

          <p className="text-slate-500 text-sm mt-8">
            По всем вопросам, предложениям и сотрудничеству
          </p>
        </div>
      </section>
    </div>
  )
}
