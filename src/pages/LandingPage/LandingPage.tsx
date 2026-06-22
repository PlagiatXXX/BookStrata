import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import {
  ArrowRight, BookOpen, Sword, Sparkles,
  Trophy, Heart, MessageCircle, MessageSquare, Zap,
  ChevronRight, ChevronUp, Menu, X, Check, Layers, Brain, Copy, Paintbrush, Send,
  BarChart3, Users,
} from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { Logo } from "@/ui/Logo"
import { Footer } from "@/ui/Footer"
import { RevealBox } from "@/ui/RevealBox"
import { Pointer } from "@/components/ui/pointer"
import { apiTrackEvent } from "@/lib/analyticsApi"
import { Highlighter } from "@/components/ui/highlighter"
import { BorderBeam } from "@/components/ui/border-beam"
import { HanddrawnSmiley } from "@/components/ui/handdrawn-smiley"
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

/* ---------- Feature card ---------- */
const features = [
  { icon: Layers, title: "Визуальные рейтинги", desc: "Создавай тир-листы любимых книг в удобном drag-and-drop редакторе. Выбирай темы, кастомизируй блоки.", featured: true },
  { icon: Brain, title: "Букстраж", desc: "ИИ-рекомендации книг на основе твоих тир-листов. Умный алгоритм подбирает то, что тебе понравится.", featured: true },
  { icon: Sword, title: "Баттлы", desc: "Сравнивай свои подборки с другими читателями. Голосуй, участвуй, докажи что твой вкус — лучший.", featured: true },
  { icon: MessageCircle, title: "Обсуждения", desc: "Комментируй подборки, общайся в общем чате, делись мнениями о книгах с единомышленниками." },
  { icon: Sparkles, title: "AI-генерация аватаров", desc: "Создавай уникальные аватарки с помощью нейросети. Просто опиши желаемый образ — и получи результат." },
  { icon: Copy, title: "Шаблоны и форки", desc: "Используй готовые шаблоны популярных тир-листов или форкай понравившиеся у других авторов. Доставай и развивай." },
  { icon: Paintbrush, title: "Украшай", desc: "Оформляй тир-листы под своё настроение и вкус, добавляй кастомные обложки." },
  { icon: Trophy, title: "Геймификация", desc: "Зарабатывай XP, открывай ачивки, повышай уровень. Соревнуйся в еженедельных баттлах." },
  { icon: Heart, title: "Совпадение вкусов", desc: "Находи читателей со схожими интересами. Сравнивай профили и подписывайся на топовых авторов." },
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
          <button onClick={() => scrollTo("features")} className="landing-nav__link" type="button">Возможности</button>
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

/* ---------- Donate Modal ---------- */
function DonateModal({ onClose }: { onClose: () => void }) {
  useBodyScrollLock(true)
  const [copied, setCopied] = useState(false)
  const cardNumber = '2202200609389554'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber)
      setCopied(true)
      apiTrackEvent('donate_copy')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = cardNumber
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      apiTrackEvent('donate_copy')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-200/20 bg-[#111] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:border-amber-200/30 hover:text-white"
          type="button"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border-2 border-amber-200/30 bg-amber-500/10">
            <Heart className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Поддержать проект</h2>
            <p className="text-sm text-gray-400">
              Любая сумма на развитие
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200/20 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-300 mb-2">
              Реквизиты для перевода
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-black/40 px-4 py-3 flex-wrap">
              <span className="font-mono text-sm md:text-base font-bold text-white tracking-wider break-all">
                {cardNumber}
              </span>
              <button
                onClick={handleCopy}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                type="button"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Сбербанк • Федор П.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/20 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-300 mb-2">
              Связаться
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://t.me/PasFedor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-amber-300 transition-colors"
              >
                <Send size={14} />
                Telegram: @PasFedor
              </a>
              <a
                href="https://vk.com/gim237287277"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-amber-300 transition-colors"
              >
                ВКонтакте
              </a>
              <a
                href="mailto:fedorpasyada@yandex.ru"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-amber-300 transition-colors"
              >
                fedorpasyada@yandex.ru
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full cursor-pointer rounded-xl border-2 border-amber-200/30 bg-amber-500/10 px-6 py-3 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/20"
          type="button"
        >
          Спасибо, понятно
        </button>
      </div>
    </div>
  )
}

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
        <h4 className="text-sm font-semibold text-[#e2e8f0]">{title}</h4>
        <p className="text-xs text-[#94a3b8] mt-0.5">{description}</p>
      </div>
    </motion.div>
  )
}

/* ---------- Sort data ---------- */

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
    if (videoRef.current) videoRef.current.playbackRate = 0.7
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
        title="Рейтинг книг — составь визуальный топ и тир лист книг онлайн"
        description="BookStrata — рейтинг книг и тир лист книг онлайн. Составляй визуальные топы любимых книг, собирай подборки по жанрам, участвуй в баттлах и получай ИИ-рекомендации. Бесплатно."
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
            Социальная сеть читателей
          </div>

          <h1 className="landing-hero__title">
            Рейтинг книг
            <br />
            и <span className="landing-hero__gradient-text">тир-лист</span> онлайн
          </h1>

          <p className="landing-hero__subtitle">
            Составляй визуальный рейтинг книг и тир-листы — расставляй любимые книги по уровням, участвуй в баттлах,
            общайся с читателями и находи книги по вкусу с помощью ИИ.
          </p>

          <div className="landing-hero__actions">
            <button
              onClick={() => navigate("/auth")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              В библиотеку
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="landing-hero__btn landing-hero__btn--secondary"
              type="button"
            >
              Узнать больше
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

      {/* ============ STATS ============ */}
      <section className="landing-stats" id="stats">
        <div className="landing-stats__grid">
          <AnimatedCounter target={forumStats?.totalUsers ?? 0} suffix="+" label="Пользователей" />
          <AnimatedCounter target={forumStats?.activeBattles ?? 0} suffix="" label="Проведено баттлов" />
          <AnimatedCounter target={forumStats?.tierLists ?? 0} suffix="" label="Создано тир-листов" />
          <AnimatedCounter target={forumStats?.totalBooks ?? 0} suffix="+" label="Книг в базе" />
        </div>
      </section>

      {/* ============ AUTHOR BANNER ============ */}
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
              <Highlighter action="box" color="#c97d60" strokeWidth={2} iterations={3} padding={5} animationDuration={800}>
                BookStrata
              </Highlighter>{' '}
               родился из простой идеи —{' '}
              <Highlighter action="circle" color="#c97d60" strokeWidth={2} iterations={2} padding={4} animationDuration={600}>
                дать читателям
              </Highlighter>{' '}
              инструмент,
              который не просто собирает книги, а помогает увидеть свой вкус,
              подчерпнуть идеи от других людей и просто{" "}
              <Highlighter action="underline" color="#c97d60" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                приятно провести время
              </Highlighter>.
              Идея понятное дело не нова — существует ряд зарубежных аналогов,
              но я взял лучшее, привнес нового и с Вашей помощью готов сделать что-то оригинальное.
              Я делаю этот проект один,{" "}
              <Highlighter action="underline" color="#b85b3f" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                вкладываю душу
              </Highlighter>{" "}
              и каждую свободную минуту. Я верю, что могу сделать качественный и
              интересный продукт, который будет полезен мне и остальным пользователям.
              Здесь нет маркетинговых манипуляций и пустых обещаний — только{" "}
              <Highlighter action="underline" color="#c97d60" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                искреннее желание
              </Highlighter>{" "}
              сделать{" "}
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
              Подписывайтесь на наши группы в{" "}
              <a href="https://vk.com/club237287277" target="_blank" rel="noopener noreferrer" className="landing-banner__text-link">ВК</a>
              {" "}или{" "}
              <a href="https://t.me/bookstrata" target="_blank" rel="noopener noreferrer" className="landing-banner__text-link">Telegram</a>
              , чтобы не упустить важные новости и обновления!
            </p>
            <p>
              <Highlighter action="underline" color="#c97d60" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                Спасибо, что Вы здесь
              </Highlighter>
              . Вместе мы{" "}
              <Highlighter action="underline" color="#b85b3f" strokeWidth={2} iterations={3} padding={4} animationDuration={800}>
                сделаем BookStrata чем-то большим
              </Highlighter>.
            </p>
            <HanddrawnSmiley className="landing-banner__smiley" size={48} />
          </blockquote>
          <div className="landing-banner__author">
            <span className="landing-banner__author-name">Фёдор</span>
            <span className="landing-banner__author-role">создатель BookStrata</span>
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
              onClick={() => navigate("/auth")}
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

      {/* ============ FEATURES ============ */}
      <section className="landing-section" id="features">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Все возможности</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">BookStrata — это не просто тир-листы</p></RevealBox>

          <div className="landing-features">
            {features.map((f) => (
              <RevealBox key={f.title} className={`landing-feature ${f.featured ? "landing-feature--featured" : ""}`}>
                {f.featured ? (
                  <>
                    <div className="landing-feature__content">
                      <h3 className="landing-feature__title">{f.title}</h3>
                      <p className="landing-feature__desc">{f.desc}</p>
                    </div>
                    <div className="landing-feature__icon">
                      <f.icon size={28} />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="landing-feature__title">{f.title}</h3>
                    <p className="landing-feature__desc">{f.desc}</p>
                  </>
                )}
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ FOR WHOM ============ */}
      <section className="landing-section" id="for-whom">
        <div className="landing-section__container" style={{ maxWidth: 900 }}>
          <RevealBox>
            <h2 className="landing-section__title">Для кого этот проект</h2>
          </RevealBox>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <BookOpen size={24} />,
                title: "Книголюбы",
                description: "Для тех, кто хочет систематизировать прочитанное и делиться своим мнением в наглядном формате.",
              },
              {
                icon: <Users size={24} />,
                title: "Читательские сообщества",
                description: "Для книжных клубов и сообществ, которые ищут удобный способ обсуждать и сравнивать книги.",
              },
              {
                icon: <Heart size={24} />,
                title: "Авторы и блогеры",
                description: "Для тех, кто хочет продвигать книги, собирать обратную связь и находить свою аудиторию.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-8 text-center rounded-2xl border border-white/[0.06] bg-[rgba(15,30,50,0.4)] backdrop-blur-[12px] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(6,188,249,0.1)] text-[#06bcf9] flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">{item.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
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
                  onClick={() => plan.donate ? (apiTrackEvent('donate_page_open'), setIsDonateOpen(true)) : navigate("/auth")}
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
          <RevealBox><h2 className="landing-cta__title">Готов создать свой первый тир-лист?</h2></RevealBox>
          <RevealBox><p className="landing-cta__subtitle">Присоединяйся к сообществу читателей. Это бесплатно.</p></RevealBox>
          <RevealBox>
            <button
              onClick={() => navigate("/auth")}
              className="landing-cta__btn"
              type="button"
            >
              Начать сейчас
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
