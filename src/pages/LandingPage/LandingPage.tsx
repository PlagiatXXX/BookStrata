import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/hooks/useAuthContext"
import { ArrowRight, Sparkles, ChevronUp, Menu, X } from "lucide-react"
import { Logo } from "@/ui/Logo"
import { Footer } from "@/ui/Footer"
import { Spinner } from "@/components/Spinner"
import { SEOHead } from "@/components/SEO/SEOHead"
import { getPublicTierLists } from "@/lib/tierListApi"
import { getForumStats } from "@/lib/battlesApi"
import { heroPhrases } from "./landingData"
import "./LandingPage.css"

// Ленивая загрузка секций ниже фолда (framer-motion, иконки, API-данные — в отдельном чанке)
const LandingBody = lazy(() => import("./LandingBody"))

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
          <button data-analytics="nav.landing.features" onClick={() => scrollTo("scenarios")} className="landing-nav__link" type="button">Возможности</button>
          <button data-analytics="nav.landing.featured" onClick={() => scrollTo("featured")} className="landing-nav__link" type="button">Популярные тир-листы</button>
          <Link data-analytics="nav.landing.celebrities" to="/celebrities" className="landing-nav__link">Знаменитости</Link>

          <div className="landing-nav__auth">
            <button data-analytics="auth.login_landing" onClick={() => navigate("/auth")} className="landing-nav__link" type="button">Войти</button>
            <button data-analytics="cta.landing.create_tierlist_header" onClick={() => navigate("/tier-lists/new")} className="landing-nav__cta landing-nav__cta--primary" type="button">
              Создать тир-лист
            </button>
          </div>
        </div>

        <button
          data-analytics="ui.landing.menu_toggle"
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

/* ---------- Main landing page ---------- */
export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const { data: tierListsData } = useQuery({
    queryKey: ["landing-tierlists"],
    queryFn: () => getPublicTierLists(1, 4, "likes"),
    staleTime: 120_000,
    gcTime: 300_000,
  })

  const { data: forumStats } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: () => getForumStats(),
    staleTime: 120_000,
    gcTime: 300_000,
  })

  const tierLists = tierListsData?.data
  const videoRef = useRef<HTMLVideoElement>(null)

  const [showScrollTop, setShowScrollTop] = useState(false)
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % heroPhrases.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = 0.7

    // Poster уже в CSS background-image — LCP не зависит от видео.
    // Стартуем видео после загрузки страницы, чтобы не конкурировать за ресурсы.
    const startVideo = () => {
      video.play().catch(() => {
        /* автоплей заблокирован браузером — ок */
      })
    }

    if (document.readyState === "complete") {
      startVideo()
    } else {
      window.addEventListener("load", startVideo, { once: true })
    }

    return () => {
      window.removeEventListener("load", startVideo)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > window.innerHeight * 0.5)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Пока проверяется сессия — не рендерим контент, чтобы не моргал
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Авторизованные пользователи — редирект на дашборд
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-page">
      <SEOHead
        title="BookStrata — рейтинги книг и тир-листы онлайн"
        description="BookStrata — бесплатный сервис для рейтингов книг, визуальных тир-листов и поиска единомышленников. Создавай подборки, делись с друзьями и открывай новое."
        image="/hero-bg.webp"
        url="/"
      />
      <LandingNav />

      {/* ============ HERO ============ */}
      <section className="landing-hero">
        <video
          className="landing-hero__video"
          src="/lending-hero.mp4"
          muted
          loop
          playsInline
          preload="none"
          ref={videoRef}
          poster="/library-bg.webp"
        />
        <div className="landing-hero__gradient" />
        <div className="landing-hero__pattern" />

        <div className="landing-hero__content">
          <div className="landing-hero__badge">
            <Sparkles size={14} />
            Пользовательские рейтинги книг
          </div>

          <h1 className="landing-hero__title">
            BookStrata — твои книжные топы в красивых тир-листах.
            <br />
            <span className="landing-hero__carousel">
              <span
                key={phraseIndex}
                className="landing-hero__gradient-text landing-hero__phrase"
              >
                {heroPhrases[phraseIndex]}
              </span>
            </span>
          </h1>

          <p className="landing-hero__subtitle">
            Создавайте тир-листы, ведите личную библиотеку, находите книги
            по вкусу с&nbsp;ИИ и общайтесь с&nbsp;единомышленниками.
          </p>

          <div className="landing-hero__actions">
            <button
              data-analytics="cta.landing.start_free_hero"
              onClick={() => navigate("/tier-lists/new")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              Создать свой тир-лист
              <ArrowRight size={18} />
            </button>
            <button
              data-analytics="cta.landing.how_it_looks"
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

      {/* ============ СЕКЦИИ НИЖЕ ФОЛДА (ленивая загрузка) ============ */}
      <Suspense fallback={<BodySkeleton />}>
        <LandingBody
          tierLists={tierLists}
          forumStats={forumStats}
        />
      </Suspense>

      {/* Scroll-to-top button */}
      <button
        data-analytics="ui.landing.scroll_to_top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed left-3 bottom-6 z-40 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition-all hover:opacity-70"
        style={{ opacity: showScrollTop ? 0.35 : 0, pointerEvents: showScrollTop ? "auto" : "none" }}
        aria-label="Наверх"
        type="button"
      >
        <ChevronUp size={18} />
      </button>

      <Footer variant="landing" />
    </div>
  )
}

/* ---------- Скелетон для ленивых секций ---------- */
function BodySkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 py-20 px-4">
      <div className="w-48 h-4 rounded bg-white/5 animate-pulse" />
      <div className="w-64 h-3 rounded bg-white/5 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
