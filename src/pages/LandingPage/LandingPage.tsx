import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight, BookOpen, Sword, Sparkles,
  Trophy, Heart, MessageCircle, Share2, Zap,
  ChevronRight, Menu, X, Check, Crown, Layers, Brain, Pen, Copy, Paintbrush,
} from "lucide-react"
import { Logo } from "@/ui/Logo"
import { Footer } from "@/ui/Footer"
import { RevealBox } from "@/ui/RevealBox"
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
  { icon: Brain, title: "Букстраж", desc: "ИИ-рекомендации книг на основе твоих тир-листов. Умный алгоритм подбирает то, что тебе понравится." },
  { icon: Sword, title: "Баттлы", desc: "Сравнивай свои подборки с другими читателями. Голосуй, участвуй, докажи что твой вкус — лучший." },
  { icon: MessageCircle, title: "Обсуждения", desc: "Комментируй подборки, общайся в общем чате, делись мнениями о книгах с единомышленниками." },
  { icon: Sparkles, title: "AI-генерация аватаров", desc: "Создавай уникальные аватарки с помощью нейросети. Просто опиши желаемый образ — и получи результат." },
  { icon: Copy, title: "Шаблоны и форки", desc: "Используй готовые шаблоны популярных тир-листов или форкай понравившиеся у других авторов. Доставай и развивай." },
  { icon: Paintbrush, title: "Украшай", desc: "Оформляй тир-листы под своё настроение и вкус, добавляй кастомные обложки." },
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
      "До 30 книг в тир-листе",
      "Участие в баттлах",
      "Базовые темы оформления",
      "Аналитика и статистика",
      "Экспорт PNG / PDF",
      "Литературные новости России и мира",
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
      { text: "Всё из Free", type: "header" },
      { text: "+", type: "separator" },
      "Безлимитные тир-листы",
      "Безлимит книг",
      "Кастомные обложки",
      "Эксклюзивные темы",
      "Бейдж Pro + корона",
      "Букстраж (AI-библиотекарь)",
      "AI-генерация аватарок",
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
      "+100 к карме",
      "Бейдж мецената",
      "Имя в списке спонсоров",
      "Ранний доступ к фичам",
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

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.7
  }, [])

  return (
    <div className="landing-page">
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

      {/* ============ AUTHOR BANNER ============ */}
      <section className="landing-banner" id="author-note">
        <div className="landing-banner__bg" />
        <div className="landing-banner__content">
          <span className="landing-banner__quote-mark">"</span>
          <blockquote className="landing-banner__text">
            <p>BookStrata родился из простой идеи — дать читателям инструмент, который не просто собирает книги, а помогает увидеть свой вкус, подчерпнуть идеи от других людей и просто приятно провести время. Идея понятное дело не нова - существует ряд зарубежных аналогов, но я взял лучшее, привнес нового и с Вашей помощью готов сделать что то оригинальное. Я делаю этот проект один, вкладываю душу и каждую свободную минуту. Я верю, что можно сделать качественный и полностью российский продукт не хуже аналоговых. Здесь нет маркетинговых манипуляций и пустых обещаний — только искреннее желание сделать лучшую социальную сеть для тех, кто любит читать.</p>
            <p>Возможно, Вы спросите: "Федор, а почему же тогда Pro-подписки, если нет маркетинга?" Отвечаю: "это необходимость, чтобы приложение жило и развивалось." Суммы намеренно сделаны символическими, а бесплатный функционал остаётся вполне полноценным. Так же есть возможность дополнительно помочь проекту через донат. Если у Вас нет ни малейшей возможности оплатить подписку, а тот функционал Вам крайне важен - напишите мне по контактам и в частном порядке мы решим эти вопросы. </p>
            <p>Для проекта жизненно необходимы Ваши мнения, критика, идеи, предложения, замечания. Поэтому буду благодарен обратной связи.</p>
            <p>Спасибо, что Вы здесь. Вместе мы сделаем BookStrata чем-то большим.</p>
          </blockquote>
          <div className="landing-banner__author">
            <span className="landing-banner__author-name">Фёдор</span>
            <span className="landing-banner__author-role">создатель BookStrata</span>
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ HOW IT WORKS ============ */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Как это работает</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">Четыре простых шага, чтобы начать</p></RevealBox>

          <div className="landing-steps">
            <RevealBox className="landing-step">
              <div className="landing-step__icon"><Pen size={28} /></div>
              <span className="landing-step__number">01</span>
              <h3 className="landing-step__title">Создай тир-лист</h3>
              <p className="landing-step__desc">Придумай название, добавь обложку, выбери уникальный фон. Твой рейтинг — твой стиль.</p>
            </RevealBox>
            <ArrowRight size={32} className="landing-step-arrow landing-step-arrow--right" />
            <RevealBox className="landing-step">
              <div className="landing-step__icon"><BookOpen size={28} /></div>
              <span className="landing-step__number">02</span>
              <h3 className="landing-step__title">Выбери книги</h3>
              <p className="landing-step__desc">Находи книги из обширной базы через поиск по названию или автору. Всё под рукой.</p>
            </RevealBox>
            <RevealBox className="landing-step">
              <div className="landing-step__icon"><Layers size={28} /></div>
              <span className="landing-step__number">03</span>
              <h3 className="landing-step__title">Расставь по блокам</h3>
              <p className="landing-step__desc">Перетаскивай книги между блоками S, A, B, C и D. Кастомизируй цвета, названия и порядок.</p>
            </RevealBox>
            <ArrowRight size={32} className="landing-step-arrow landing-step-arrow--right" />
            <RevealBox className="landing-step">
              <div className="landing-step__icon"><Share2 size={28} /></div>
              <span className="landing-step__number">04</span>
              <h3 className="landing-step__title">Делись и соревнуйся</h3>
              <p className="landing-step__desc">Публикуй тир-лист, участвуй в баттлах, читай актуальные новости из мира литературы, обсуждай подборки и находи единомышленников.</p>
            </RevealBox>
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
              <RevealBox key={f.title} className="landing-feature">
                <div className="landing-feature__icon">
                  <f.icon size={22} />
                </div>
                <h3 className="landing-feature__title">{f.title}</h3>
                <p className="landing-feature__desc">{f.desc}</p>
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ PRICING ============ */}
      <section className="landing-section landing-section--alt" id="pricing">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Выберите свой план</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">Начните бесплатно, развивайтесь с Pro</p></RevealBox>

          <RevealBox className="landing-pricing">
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
                  {plan.features.map((f, i) => {
                    const text = typeof f === "string" ? f : f.text
                    const isHeader = typeof f === "object" && f.type === "header"
                    const isSep = typeof f === "object" && f.type === "separator"
                    return (
                      <li
                        key={i}
                        className={`landing-pricing__feature ${isHeader ? "landing-pricing__feature--header" : ""} ${isSep ? "landing-pricing__feature--sep" : ""}`}
                      >
                        {isHeader || isSep ? null : <Check size={14} />}
                        {text}
                      </li>
                    )
                  })}
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

      <Footer variant="landing" />
    </div>
  )
}
