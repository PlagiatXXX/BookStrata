import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import {
  ArrowRight, BookOpen, Sword, Sparkles,
  Heart, MessageSquare, Zap,
  ChevronRight, ChevronUp, Menu, X, Check, Layers,
  BarChart3,
} from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { Logo } from "@/ui/Logo"
import { Footer } from "@/ui/Footer"
import { RevealBox } from "@/ui/RevealBox"
import { Pointer } from "@/components/ui/pointer"
import { apiTrackEvent } from "@/lib/analyticsApi"
import { BorderBeam } from "@/components/ui/border-beam"
import { DonateModal } from "@/components/DonateModal/DonateModal"
import { SEOHead } from "@/components/SEO/SEOHead"
import { getPublicTierLists, type TierListShort } from "@/lib/tierListApi"
import { getForumStats } from "@/lib/battlesApi"
import { proxyImageUrl } from "@/utils/imageProxy"
import "./LandingPage.css"

/* ---------- Animated counter ---------- */
function AnimatedCounter({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) {
  const [displayed, setDisplayed] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === 0) return
    if (prevTarget.current === target) return
    prevTarget.current = target

    const from = displayed || 0
    const delta = target - from
    const duration = 2000
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + eased * delta))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [target, displayed])

  return (
    <div className="landing-stat">
      <span className="landing-stat__number">{displayed.toLocaleString()}{suffix}</span>
      <span className="landing-stat__label">{label}</span>
    </div>
  )
}

/* ---------- Scenario card ---------- */
interface ScenarioItem {
  icon: React.ComponentType<{ size?: number }>
  title: string
  points: string[]
  gradient: string
  featured?: boolean
}

const scenarios: ScenarioItem[] = [
  {
    icon: BookOpen,
    title: "Ведите свою библиотеку",
    points: [
      "Добавляйте книги из Google Books и LiveLib",
      "Отмечайте статус: прочитано / читаю / планирую",
      "Никогда не забывайте, что читали",
    ],
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Layers,
    title: "Создавайте личные рейтинги",
    points: [
      "Распределяйте книги по уровням S, A, B, C, D",
      "Кастомизируйте темы, обложки и блоки",
      "Делитесь визуальными подборками с друзьями",
    ],
    gradient: "from-violet-600 to-purple-600",
    featured: true,
  },
  {
    icon: Heart,
    title: "Находите единомышленников",
    points: [
      "Сравнивайте свои рейтинги с другими читателями",
      "Подписывайтесь на людей с похожим вкусом",
      "Обсуждайте книги в комментариях",
    ],
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: Sparkles,
    title: "Открывайте новые книги",
    points: [
      "ИИ анализирует ваши вкусы и предлагает новинки",
      "Подборки на основе реальных читательских предпочтений",
      "Попадайте в книги, которые точно зайдут",
    ],
    gradient: "from-sky-500 to-indigo-600",
  },
]

/* ---------- Pricing ---------- */
const allFeatures = [
  "Безлимитные тир-листы",
  "Безлимит книг в тир-листе",
  "Все темы оформления",
  "Баттлы и обсуждения",
  "Кастомные обложки",
  "Экспорт PNG",
  "Букстраж (AI-рекомендации)",
  "Добавление книг через Google Books и LiveLib",
  "AI-генерация аватарок",
  "И многое другое",
]

const plans = [
  {
    name: "Всё бесплатно",
    features: allFeatures,
    cta: "Начать бесплатно",
    donate: false,
  },
  {
    name: "Донат",
    price: "Любая",
    period: "сумма",
    desc: "Поддержите развитие проекта",
    features: [
      "+100 к карме",
      "Бейдж мецената",
      "Имя в списке спонсоров",
      "Ранний доступ к фичам",
    ],
    cta: "Поддержать",
    donate: true,
  },
]

/* ---------- Target audience ---------- */
const audienceItems = [
  {
    icon: BookOpen,
    title: "Читаете 5–15 книг в год",
    desc: "Чтобы не забывать прочитанное, вести список «что дальше» и находить новые книги по своим интересам.",
  },
  {
    icon: Heart,
    title: "Любите делиться и сравнивать",
    desc: "Чтобы показывать друзьям свой топ книг, участвовать в обсуждениях и находить людей со схожим вкусом.",
  },
  {
    icon: Sparkles,
    title: "Устали от случайных рекомендаций",
    desc: "Чтобы получать подборки книг, которые действительно подходят под ваш вкус, а не общие списки бестселлеров.",
  },
]

/* ---------- Nav ---------- */
function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }, [])

  return (
    <nav className="landing-nav">
      <div className="landing-nav__inner">
        <Logo onClick={() => navigate("/")} />

        <div className={`landing-nav__links ${mobileOpen ? "landing-nav__links--open" : ""}`}>
          <button onClick={() => scrollTo("scenarios")} className="landing-nav__link" type="button">Возможности</button>
          <Link to="/rankings" className="landing-nav__link">Рейтинг книг</Link>
          <Link to="/what-to-read" className="landing-nav__link">Что почитать</Link>
          <button onClick={() => scrollTo("pricing")} className="landing-nav__link" type="button">Тарифы</button>
          <a href="https://t.me/bookstrata" target="_blank" rel="noopener noreferrer" className="landing-nav__link">Telegram</a>

          <div className="landing-nav__auth">
            <button onClick={() => navigate("/auth")} className="landing-nav__link" type="button">Войти</button>
            <button onClick={() => navigate("/auth?mode=register")} className="landing-nav__cta landing-nav__cta--primary" type="button">
              Регистрация
            </button>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="landing-nav__burger"
          type="button"
          aria-label="Меню"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  )
}

/* ---------- Tier list mini card ---------- */
const MiniTierCard = memo(function MiniTierCard({ item }: { item: TierListShort }) {
  return (
    <Link to={`/tier-lists/${item.slug || item.id}`} className="mini-tier-card">
      <div
        className="mini-tier-card__cover"
        style={{
        backgroundImage: item.coverImageUrl
          ? `url(${proxyImageUrl(item.coverImageUrl)})`
          : "linear-gradient(135deg, rgba(6,188,249,0.2), rgba(168,85,247,0.2))",
        }}
      >
        <div className="mini-tier-card__overlay">
          <Layers size={18} />
        </div>
      </div>
      <div className="mini-tier-card__body">
        <h3 className="mini-tier-card__title">{item.title}</h3>
        <div className="mini-tier-card__meta">
          <span>@{item.user?.username || item.authorName || "anonymous"}</span>
          {item.likesCount != null && (
            <span className="mini-tier-card__likes">
              <Heart size={12} fill="currentColor" />
              {item.likesCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
})

/* ---------- Screenshot card ---------- */
function ScreenshotCard({ title, description, gradient, icon, index, src, videoSrc, onOpen }: {
  title: string
  description: string
  gradient: string
  icon: React.ReactNode
  index: number
  src?: string
  videoSrc?: string
  onOpen?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className={`group ${src || videoSrc ? "cursor-pointer" : ""}`}
      onClick={onOpen}
    >
      <div
        className={`relative overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-shadow duration-300 bg-[rgba(15,30,50,0.6)] aspect-[4/3] flex items-center justify-center ${src || videoSrc ? "" : gradient}`}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain rounded-2xl"
          />
        ) : src ? (
          <img
            src={src}
            srcSet={`
              ${src.replace('.webp', '-400.webp')} 400w,
              ${src.replace('.webp', '-800.webp')} 800w,
              ${src} 1200w
            `}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            alt={title}
            loading="lazy"
            className="h-full w-full object-contain rounded-2xl"
          />
        ) : (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />
            <div className="relative flex flex-col items-center gap-3 text-white">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {icon}
              </div>
              <span className="text-sm font-medium opacity-80">Скоро</span>
            </div>
          </>
        )}
      </div>
      <div className="mt-3 text-center">
        <h3 className="text-sm font-semibold text-[#e2e8f0]">{title}</h3>
        <p className="text-xs text-[#94a3b8] mt-0.5">{description}</p>
      </div>
    </motion.div>
  )
}

/* ---------- Screenshots data ---------- */
const screenshots = [
  {
    title: "Главная",
    description: "Лента тир-листов и подборок",
    gradient: "bg-linear-to-br from-violet-900/80 to-purple-900/80",
    icon: <BookOpen size={28} />,
    src: "/screenshots/dashboard.webp",
  },
  {
    title: "Редактор",
    description: "Drag-and-drop тир-листа",
    gradient: "bg-linear-to-br from-slate-800 to-slate-900/90",
    icon: <Layers size={28} />,
    videoSrc: "/screenshots/tier-list.mp4",
  },
  {
    title: "Баттлы",
    description: "Сравнение подборок",
    gradient: "bg-linear-to-br from-rose-900/80 to-orange-900/80",
    icon: <Sword size={28} />,
    src: "/screenshots/battles.webp",
  },
  {
    title: "Профиль",
    description: "Статистика и достижения",
    gradient: "bg-linear-to-br from-amber-900/80 to-orange-900/80",
    icon: <BarChart3 size={28} />,
    src: "/screenshots/profile.webp",
  },
  {
    title: "Личная библиотека",
    description: "Поиск и подборки",
    gradient: "bg-linear-to-br from-emerald-900/80 to-teal-900/80",
    icon: <MessageSquare size={28} />,
    src: "/screenshots/library.webp",
  },
  {
    title: "ИИ-рекомендации",
    description: "Умный подбор книг",
    gradient: "bg-linear-to-br from-sky-900/80 to-indigo-900/80",
    icon: <Sparkles size={28} />,
    src: "/screenshots/AI.webp",
  },
]

/* ---------- Lightbox ---------- */
function Lightbox({ screenshot, onClose }: {
  screenshot: typeof screenshots[number]
  onClose: () => void
}) {
  useBodyScrollLock(true)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {screenshot.videoSrc ? (
          <video
            src={screenshot.videoSrc}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl"
          />
        ) : (
          <img
            src={screenshot.src}
            alt={screenshot.title}
            loading="lazy"
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
          />
        )}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border border-(--accent-main)/40 bg-(--accent-main) text-white transition-colors hover:brightness-110 shadow-lg"
          type="button"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

/* ---------- Main landing page ---------- */
export default function LandingPage() {
  const navigate = useNavigate()

  const { data: tierListsData } = useQuery({
    queryKey: ["landing-tierlists"],
    queryFn: () => getPublicTierLists(1, 4, "likes"),
    staleTime: 60_000,
  })

  const { data: forumStats } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: () => getForumStats(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const tierLists = tierListsData?.data
  const videoRef = useRef<HTMLVideoElement>(null)

  const [isDonateOpen, setIsDonateOpen] = useState(false)
  const [activeScreenshot, setActiveScreenshot] = useState<number | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = 0.7
    video.setAttribute("fetchpriority", "high")
  }, [])

  // Preload LCP-изображение (poster видео)
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.as = "image"
    link.href = "/library-bg.webp"
    link.setAttribute("fetchpriority", "high")
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > window.innerHeight * 0.5)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="landing-page">
      <SEOHead
        title="BookStrata — интерактивный рейтинг книг, твоё книжное пространство"
        description="BookStrata — личная библиотека, визуальные рейтинги книг и сообщество читателей. Ведите список прочитанного, составляйте тир-листы, находите книги по вкусу с ИИ. Бесплатно."
        image="/hero-bg.webp"
        url="/"
      />
      <LandingNav />

      {/* ============ HERO ============ */}
      <section className="landing-hero">
        <video
          className="landing-hero__video"
          src="/lending-hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          ref={videoRef}
          poster="/library-bg.webp"
        />
        <div className="landing-hero__gradient" />
        <div className="landing-hero__pattern" />

        <div className="landing-hero__content">
          <div className="landing-hero__badge">
            <Sparkles size={14} />
            Ваша читательская история
          </div>

          <h1 className="landing-hero__title">
            Помните каждую
            <br />
            прочитанную книгу.
            <br />
            <span className="landing-hero__gradient-text">Открывайте новые.</span>
          </h1>

          <p className="landing-hero__subtitle">
            BookStrata — личная библиотека, визуальные рейтинги книг
            и сообщество читателей в одном месте. Ведите список прочитанного,
            составляйте тир-листы, находите книги по вкусу с&nbsp;помощью&nbsp;ИИ.
          </p>

          <div className="landing-hero__actions">
            <button
              onClick={() => navigate("/auth?mode=register")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              Начать бесплатно
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById("screenshots")?.scrollIntoView({ behavior: "smooth" })}
              className="landing-hero__btn landing-hero__btn--secondary"
              type="button"
            >
              Как это выглядит
            </button>
          </div>
        </div>

        {/* Floating mockup */}
        <div className="landing-hero__mockup">
          <div className="landing-hero__mockup-inner">
            <div className="landing-hero__mockup-bar">
              <span /><span /><span />
            </div>
            {["S", "A", "B", "C"].map((tier) => (
              <div key={tier} className="landing-hero__mockup-row">
                <span className="landing-hero__mockup-tier">{tier}</span>
                <div className="landing-hero__mockup-books">
                  {Array.from({ length: tier === "S" ? 2 : 3 }).map((_, i) => (
                    <div key={i} className="landing-hero__mockup-book" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SCREENSHOTS ============ */}
      <section className="landing-section" id="screenshots">
        <div className="landing-section__container">
          <RevealBox>
            <h2 className="landing-section__title">Как это выглядит</h2>
          </RevealBox>
          <RevealBox>
            <p className="landing-section__subtitle">Все экраны приложения</p>
          </RevealBox>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {screenshots.map((shot, i) => (
              <ScreenshotCard
                key={i}
                title={shot.title}
                description={shot.description}
                gradient={shot.gradient}
                icon={shot.icon}
                index={i}
                src={"src" in shot ? shot.src : undefined}
                videoSrc={"videoSrc" in shot ? (shot as { videoSrc: string }).videoSrc : undefined}
                onOpen={shot.src || shot.videoSrc ? () => setActiveScreenshot(i) : undefined}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="landing-stats" id="stats">
        <div className="landing-stats__grid">
          <AnimatedCounter target={forumStats?.totalUsers ?? 0} suffix="+" label="Пользователей" />
          <AnimatedCounter target={forumStats?.activeBattles ?? 0} suffix="" label="Проведено баттлов" />
          <AnimatedCounter target={forumStats?.tierLists ?? 0} suffix="" label="Создано тир-листов" />
          <AnimatedCounter target={forumStats?.totalBooks ?? 0} suffix="+" label="Книг в базе" />
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ SCENARIOS ============ */}
      <section className="landing-section" id="scenarios">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Что вы сможете делать</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">BookStrata закрывает главные потребности читателя</p></RevealBox>

          <div className="landing-features">
            {scenarios.map((s) => (
              <RevealBox key={s.title} className={`landing-feature ${s.featured ? "landing-feature--featured" : ""}`}>
                {s.featured ? (
                  <>
                    <div className="landing-feature__content">
                      <h3 className="landing-feature__title">{s.title}</h3>
                      <ul className="landing-feature__list">
                        {s.points.map((point, i) => (
                          <li key={i} className="landing-feature__list-item">
                            <span className="landing-feature__check" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="landing-feature__icon">
                      <s.icon size={28} />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="landing-feature__title">{s.title}</h3>
                    <ul className="landing-feature__list">
                      {s.points.map((point, i) => (
                        <li key={i} className="landing-feature__list-item">
                          <span className="landing-feature__check" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ FEATURED ============ */}
      <section className="landing-section landing-section--alt" id="featured">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Популярные тир-листы</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">Что создают наши пользователи</p></RevealBox>

          <RevealBox className="landing-featured">
            {tierLists && tierLists.length > 0
              ? tierLists.map((item) => <MiniTierCard key={item.id} item={item} />)
              : Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mini-tier-card mini-tier-card--skeleton">
                    <div className="mini-tier-card__cover" />
                    <div className="mini-tier-card__body">
                      <div className="mini-tier-card__skeleton-line" />
                      <div className="mini-tier-card__skeleton-line mini-tier-card__skeleton-line--short" />
                    </div>
                  </div>
                ))}
          </RevealBox>

          <RevealBox className="landing-section__action">
            <button
              onClick={() => navigate("/auth?mode=register")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              Смотреть все
              <ChevronRight size={18} />
            </button>
          </RevealBox>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ TARGET AUDIENCE ============ */}
      <section className="landing-section" id="audience">
        <div className="landing-section__container" style={{ maxWidth: 900 }}>
          <RevealBox>
            <h2 className="landing-section__title">Кому подойдёт BookStrata</h2>
          </RevealBox>
          <RevealBox>
            <p className="landing-section__subtitle">Сценарии, в которых проект становится полезным</p>
          </RevealBox>

          <div className="grid sm:grid-cols-3 gap-6">
            {audienceItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-8 text-center rounded-2xl border border-white/[0.06] bg-[rgba(15,30,50,0.4)] backdrop-blur-[12px] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(6,188,249,0.1)] text-[#06bcf9] flex items-center justify-center mx-auto mb-4">
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">{item.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ AUTHOR NOTE ============ */}
      <section className="landing-banner" id="author-note">
        <div className="landing-banner__bg" />
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
        <div className="landing-banner__content">
          <span className="landing-banner__quote-mark">"</span>
          <blockquote className="landing-banner__text">
            <p>
              BookStrata родился из простой идеи —{' '}
              дать читателям инструмент, который не просто собирает книги,
              а помогает увидеть свой вкус, находить единомышленников
              и открывать новое. Я делаю этот проект один, вкладываю душу
              и каждую свободную минуту.
            </p>
            <p>
              Здесь нет маркетинговых манипуляций и пустых обещаний — только
              искреннее желание сделать лучшую площадку для тех, кто любит
              читать, делиться и вдохновляться.
            </p>
          </blockquote>

          <Link
            to="/history"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: "#fb923c" }}
          >
            Читать историю проекта →
          </Link>

          <div className="landing-banner__author">
            <span className="landing-banner__author-name">Фёдор</span>
            <span className="landing-banner__author-role">создатель BookStrata</span>
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ PRICING ============ */}
      <section className="landing-section landing-section--alt" id="pricing">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Выберите свой план</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">Всё бесплатно, без ограничений</p></RevealBox>

          <RevealBox className="landing-pricing">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`landing-pricing__card relative ${plan.donate ? "landing-pricing__card--donate" : ""}`}
              >
                {plan.donate && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                    <BorderBeam
                      duration={10}
                      size={250}
                      colorFrom="#f59e0b"
                      colorTo="#fbbf24"
                      borderWidth={2}
                    />
                  </div>
                )}

                {!plan.donate && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                    <BorderBeam
                      duration={10}
                      size={250}
                      colorFrom="#3b82f6"
                      colorTo="#60a5fa"
                      borderWidth={2}
                    />
                  </div>
                )}

                {!plan.donate && (
                  <div className="landing-pricing__free-badge">Всё включено</div>
                )}

                <h3 className="landing-pricing__name">
                  {plan.name === "Донат" ? (
                    <Heart size={18} className="text-amber-300" />
                  ) : (
                    <Sparkles size={18} className="text-cyan-400" />
                  )}
                  {plan.name}
                </h3>

                {plan.donate && (
                  <>
                    <div className="landing-pricing__price">
                      <span className="landing-pricing__amount">{plan.price}</span>
                      <span className="landing-pricing__period">/{plan.period}</span>
                    </div>
                    {plan.desc && <p className="landing-pricing__desc">{plan.desc}</p>}
                  </>
                )}

                <button
                  onClick={() => plan.donate ? (apiTrackEvent('donate_page_open'), setIsDonateOpen(true)) : navigate("/auth?mode=register")}
                  className={`landing-pricing__cta ${plan.donate ? "landing-pricing__cta--donate" : ""}`}
                  type="button"
                >
                  {plan.donate ? "Поддержать" : "Начать сейчас"}
                </button>

                <ul className="landing-pricing__features">
                  {plan.features.map((text, i) => (
                    <li key={i} className="landing-pricing__feature">
                      <Check size={14} />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </RevealBox>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ FINAL CTA ============ */}
      <section className="landing-cta">
        <div className="landing-cta__bg" />
        <div className="landing-cta__content">
          <RevealBox><h2 className="landing-cta__title">Ваши книги ждут</h2></RevealBox>
          <RevealBox><p className="landing-cta__subtitle">Начните бесплатно — без ограничений и скрытых платежей.</p></RevealBox>
          <RevealBox>
            <button
              onClick={() => navigate("/auth?mode=register")}
              className="landing-cta__btn"
              type="button"
            >
              Создать аккаунт
              <Zap size={20} />
            </button>
          </RevealBox>
        </div>
      </section>

      {isDonateOpen && (
        <DonateModal onClose={() => setIsDonateOpen(false)} />
      )}

      {activeScreenshot != null && (
        <Lightbox
          screenshot={screenshots[activeScreenshot]}
          onClose={() => setActiveScreenshot(null)}
        />
      )}

      {/* Scroll-to-top button */}
      <motion.button
        animate={{ opacity: showScrollTop ? 0.35 : 0, pointerEvents: showScrollTop ? "auto" : "none" }}
        whileHover={{ opacity: 0.7 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed left-3 bottom-6 z-40 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition-all"
        aria-label="Наверх"
        type="button"
      >
        <ChevronUp size={18} />
      </motion.button>

      <Footer variant="landing" />
    </div>
  )
}
