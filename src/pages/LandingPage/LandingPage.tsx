import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight, BookOpen, Sword, Sparkles,
  Trophy, Heart, MessageCircle, Share2, Zap,
  ChevronRight, Menu, X, Check, Crown, Layers, Brain,
} from "lucide-react"
import { Logo } from "@/ui/Logo"
import { Footer } from "@/ui/Footer"
import { getPublicTierLists, type TierListShort } from "@/lib/tierListApi"
import { getForumStats } from "@/lib/battlesApi"
import "./LandingPage.css"

/* ---------- Animated counter ---------- */
function AnimatedCounter({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const duration = 2000
          const start = performance.now()

          function tick(now: number) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }

          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, hasAnimated])

  return (
    <div ref={ref} className="landing-stat">
      <span className="landing-stat__number">{count.toLocaleString()}{suffix}</span>
      <span className="landing-stat__label">{label}</span>
    </div>
  )
}

/* ---------- Feature card ---------- */
const features = [
  { icon: Layers, title: "Визуальные рейтинги", desc: "Создавай тир-листы любимых книг в удобном drag-and-drop редакторе. Выбирай темы, кастомизируй блоки." },
  { icon: Sword, title: "Баттлы", desc: "Сравнивай свои подборки с другими читателями. Голосуй, участвуй, докажи что твой вкус — лучший." },
  { icon: MessageCircle, title: "Обсуждения", desc: "Комментируй подборки, общайся в общем чате, делись мнениями о книгах с единомышленниками." },
  { icon: Brain, title: "Букстраж", desc: "ИИ-рекомендации книг на основе твоих тир-листов. Умный алгоритм подбирает то, что тебе понравится." },
  { icon: Trophy, title: "Геймификация", desc: "Зарабатывай XP, открывай ачивки, повышай уровень. Соревнуйся в еженедельных баттлах." },
  { icon: Heart, title: "Совпадение вкусов", desc: "Находи читателей со схожими интересами. Сравнивай профили и подписывайся на топовых авторов." },
]

/* ---------- Pricing ---------- */
const plans = [
  {
    name: "Free",
    price: "0",
    period: "навсегда",
    desc: "Попробуйте все базовые возможности",
    features: [
      "До 5 тир-листов",
      "До 20 книг в тир-листе",
      "Участие в баттлах",
      "Базовые темы оформления",
      "Экспорт PNG / PDF",
    ],
    cta: "Начать бесплатно",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "300",
    period: "в месяц",
    desc: "Для тех, кто живёт книгами",
    features: [
      "Безлимитные тир-листы",
      "Безлимит книг",
      "Кастомные обложки",
      "Эксклюзивные темы",
      "Бейдж Pro + корона",
      "Букстраж (AI-рекомендации)",
      "Аналитика и статистика",
    ],
    cta: "Оформить Pro",
    highlighted: true,
  },
  {
    name: "Донат",
    price: "Любая",
    period: "сумма",
    desc: "Поддержите развитие проекта",
    features: [
      "Бейдж мецената",
      "Имя в списке спонсоров",
      "Доступ к закрытому чату",
      "Ранний доступ к фичам",
      "Приоритетная поддержка",
    ],
    cta: "Поддержать",
    highlighted: false,
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
            <button onClick={() => navigate("/auth")} className="landing-nav__cta landing-nav__cta--primary" type="button">
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
    <Link to={`/tier-lists/${item.id}`} className="mini-tier-card">
      <div
        className="mini-tier-card__cover"
        style={{
          backgroundImage: item.coverImageUrl
            ? `url(${item.coverImageUrl})`
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

/* ---------- Main landing page ---------- */
export default function LandingPage() {
  const navigate = useNavigate()

  /* API data */
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

  /* Scroll reveal */
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]")
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing-page">
      <LandingNav />

      {/* ============ HERO ============ */}
      <section className="landing-hero">
        <video
          className="landing-hero__video"
          src="/library4k-hq.mp4"
          autoPlay
          muted
          playsInline
          poster="/hero-bg.webp"
        />
        <div className="landing-hero__gradient" />
        <div className="landing-hero__pattern" />

        <div className="landing-hero__content">
          <div className="landing-hero__badge">
            <Sparkles size={14} />
            Социальная сеть читателей
          </div>

          <h1 className="landing-hero__title">
            Создавай визуальные
            <br />
            <span className="landing-hero__gradient-text">рейтинги книг</span>
          </h1>

          <p className="landing-hero__subtitle">
            Расставляй любимые книги по блокам, участвуй в баттлах, общайся с читателями
            и находи книги по вкусу с помощью ИИ.
          </p>

          <div className="landing-hero__actions">
            <button
              onClick={() => navigate("/auth")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              Создать тир-лист
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

      {/* ============ HOW IT WORKS ============ */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section__container">
          <h2 className="landing-section__title" data-reveal>Как это работает</h2>
          <p className="landing-section__subtitle" data-reveal>Три простых шага, чтобы начать</p>

          <div className="landing-steps">
            {[
              { icon: BookOpen, step: "01", title: "Выбери книги", desc: "Добавляй книги из обширной базы или создавай свои. Поиск по названию, автору — всё под рукой." },
              { icon: Layers, step: "02", title: "Расставь по блокам", desc: "Перетаскивай книги между S, A, B, C и D блоками. Кастомизируй цвета, названия и темы оформления." },
              { icon: Share2, step: "03", title: "Делись и соревнуйся", desc: "Публикуй тир-лист, участвуй в баттлах, обсуждай подборки и находи единомышленников." },
            ].map((s) => (
              <div key={s.step} className="landing-step" data-reveal>
                <div className="landing-step__icon">
                  <s.icon size={28} />
                </div>
                <span className="landing-step__number">{s.step}</span>
                <h3 className="landing-step__title">{s.title}</h3>
                <p className="landing-step__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      <section className="landing-section landing-section--alt" id="featured">
        <div className="landing-section__container">
          <h2 className="landing-section__title" data-reveal>Популярные тир-листы</h2>
          <p className="landing-section__subtitle" data-reveal>Что создают наши пользователи</p>

          <div className="landing-featured" data-reveal>
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
          </div>

          <div className="landing-section__action" data-reveal>
            <button
              onClick={() => navigate("/auth")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              Смотреть все
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="landing-section" id="features">
        <div className="landing-section__container">
          <h2 className="landing-section__title" data-reveal>Все возможности</h2>
          <p className="landing-section__subtitle" data-reveal>BookStrata — это не просто тир-листы</p>

          <div className="landing-features">
            {features.map((f) => (
              <div key={f.title} className="landing-feature" data-reveal>
                <div className="landing-feature__icon">
                  <f.icon size={22} />
                </div>
                <h3 className="landing-feature__title">{f.title}</h3>
                <p className="landing-feature__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="landing-section landing-section--alt" id="pricing">
        <div className="landing-section__container">
          <h2 className="landing-section__title" data-reveal>Выберите свой план</h2>
          <p className="landing-section__subtitle" data-reveal>Начните бесплатно, развивайтесь с Pro</p>

          <div className="landing-pricing" data-reveal>
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`landing-pricing__card ${plan.highlighted ? "landing-pricing__card--pro" : ""}`}
              >
                {plan.highlighted && <div className="landing-pricing__badge">Популярное</div>}

                <h3 className="landing-pricing__name">
                  {plan.name === "Pro" && <Crown size={18} />}
                  {plan.name}
                </h3>

                <div className="landing-pricing__price">
                  <span className="landing-pricing__amount">{plan.price}</span>
                  <span className="landing-pricing__period">/{plan.period}</span>
                </div>

                <p className="landing-pricing__desc">{plan.desc}</p>

                <button
                  onClick={() => navigate("/auth")}
                  className={`landing-pricing__cta ${plan.highlighted ? "landing-pricing__cta--pro" : ""}`}
                  type="button"
                >
                  {plan.cta}
                </button>

                <ul className="landing-pricing__features">
                  {plan.features.map((f) => (
                    <li key={f} className="landing-pricing__feature">
                      <Check size={14} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="landing-cta">
        <div className="landing-cta__bg" />
        <div className="landing-cta__content">
          <h2 className="landing-cta__title" data-reveal>
            Готов создать свой первый тир-лист?
          </h2>
          <p className="landing-cta__subtitle" data-reveal>
            Присоединяйся к сообществу читателей. Это бесплатно.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="landing-cta__btn"
            type="button"
            data-reveal
          >
            Начать сейчас
            <Zap size={20} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
