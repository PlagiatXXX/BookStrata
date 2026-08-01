import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Heart, Layers, Sparkles, Zap, Check, X } from "lucide-react"

import { RevealBox } from "@/ui/RevealBox"
import { Pointer } from "@/components/ui/pointer"
import { BorderBeam } from "@/components/ui/border-beam"
import { DonateModal } from "@/components/DonateModal/DonateModal"
import { apiTrackEvent } from "@/lib/analyticsApi"
import { scenarios, plans, audienceItems, screenshots, type ScreenshotItem } from "./landingData"
import { proxyImageUrl } from "@/utils/imageProxy"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import type { TierListShort } from "@/lib/tierListApi"
import { TEMPLATES, type TemplateItem } from "@/data/mockData"

// Готовые шаблоны для секции «Попробуйте прямо сейчас» (см. mockData.ts)
const LANDING_TEMPLATE_IDS = [101, 102, 103]
const LANDING_TEMPLATES = TEMPLATES.filter((t) => LANDING_TEMPLATE_IDS.includes(t.id))

/* ---------- Tier list mini card ---------- */
function MiniTierCard({ item }: { item: TierListShort }) {
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
}

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
  const hasMedia = !!(src || videoSrc)
  return (
    <RevealBox className={`group ${hasMedia ? "cursor-pointer" : ""}`}>
      <div style={{ animationDelay: `${index * 0.1}s` }} onClick={onOpen}>
        <div
          className={`relative overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-shadow duration-300 bg-[rgba(15,30,50,0.6)] aspect-[4/3] flex items-center justify-center ${hasMedia ? "" : gradient}`}
        >
          {videoSrc && (
            <video
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-contain rounded-2xl"
            />
          )}
          {!videoSrc && src && (
            <img
              src={src}
              srcSet={`
                ${src.replace('.webp', '-400.webp')} 400w,
                ${src.replace('.webp', '-640.webp')} 640w,
                ${src.replace('.webp', '-800.webp')} 800w,
                ${src} 1200w
              `}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, calc(100vw - 32px)"
              alt={title}
              loading="lazy"
              fetchPriority={index === 0 ? "high" : undefined}
              className="h-full w-full object-contain rounded-2xl"
            />
          )}
          {!hasMedia && (
            <>
              <div
                className="absolute inset-0 opacity-10"
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
      </div>
    </RevealBox>
  )
}

/* ---------- Lightbox ---------- */
function Lightbox({ screenshot, onClose }: {
  screenshot: ScreenshotItem
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

/* ---------- Landing template card (готовый тир-лист для пробы) ---------- */
function LandingTemplateCard({ template }: { template: TemplateItem }) {
  const covers = (template.templateData.defaultBooks || []).slice(0, 5)
  return (
    <Link
      to={`/tier-lists/new?template=${template.id}`}
      data-analytics={`cta.landing.try_template_${template.id}`}
      className="landing-template-card"
    >
      <div className="landing-template-card__covers">
        {covers.map((b, i) => (
          <img
            key={i}
            src={b.coverImageUrl}
            alt={b.title}
            loading="lazy"
            className="landing-template-card__cover"
          />
        ))}
      </div>
      <div className="landing-template-card__body">
        <h3 className="landing-template-card__title">{template.templateData.title}</h3>
        <p className="landing-template-card__desc">{template.templateData.description}</p>
        <span className="landing-template-card__cta">
          Открыть в редакторе <ChevronRightIcon />
        </span>
      </div>
    </Link>
  )
}

/* ---------- Landing Body (секции ниже фолда) ---------- */
interface LandingBodyProps {
  tierLists: TierListShort[] | undefined
  forumStats: {
    totalUsers: number
    activeBattles: number
    tierLists: number
    totalBooks: number
  } | undefined
}

export default function LandingBody({ tierLists, forumStats }: LandingBodyProps) {
  const navigate = useNavigate()
  const [isDonateOpen, setIsDonateOpen] = useState(false)
  const [activeScreenshot, setActiveScreenshot] = useState<number | null>(null)

  return (
    <>
      {/* ============ FEATURED ============ */}
      <div className="landing-divider" />
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
              data-analytics="cta.landing.view_all_featured"
              onClick={() => navigate("/tier-lists/new")}
              className="landing-hero__btn landing-hero__btn--primary"
              type="button"
            >
              Создать свой тир-лист
              <ChevronRightIcon />
            </button>
          </RevealBox>
        </div>
      </section>

      {/* ============ TRY TEMPLATES (пробные тир-листы) ============ */}
      <section className="landing-section landing-section--alt" id="try-templates">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Попробуйте прямо сейчас</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">Готовые тир-листы: откройте, подвигайте книги и сохраните картинку. Без регистрации.</p></RevealBox>

          <div className="landing-templates">
            {LANDING_TEMPLATES.map((t) => (
              <RevealBox key={t.id}>
                <LandingTemplateCard template={t} />
              </RevealBox>
            ))}
          </div>

          <RevealBox className="landing-section__action">
            <button
              data-analytics="cta.landing.try_templates_all"
              onClick={() => navigate("/templates")}
              className="landing-hero__btn landing-hero__btn--secondary"
              type="button"
            >
              Смотреть все шаблоны
            </button>
          </RevealBox>
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

      {/* ============ FINAL CTA ============ */}
      <section className="landing-cta">
        <div className="landing-cta__bg" />
        <div className="landing-cta__content">
          <RevealBox><h2 className="landing-cta__title">Ваши книги ждут</h2></RevealBox>
          <RevealBox><p className="landing-cta__subtitle">Начните бесплатно — без ограничений и скрытых платежей.</p></RevealBox>
          <RevealBox>
            <button
              data-analytics="cta.landing.create_account_final"
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
              <RevealBox key={i} className="p-8 text-center rounded-2xl border border-white/[0.06] bg-[rgba(15,30,50,0.4)] backdrop-blur-[12px] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[rgba(6,188,249,0.1)] text-[#06bcf9] flex items-center justify-center mx-auto mb-4">
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">{item.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{item.desc}</p>
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ AUTHOR NOTE ============ */}
      <section className="landing-banner" id="author-note">
        <div className="landing-banner__bg" />
        <Pointer>
          <div className="animate-heart-bounce">
            <svg
              width="36"
              height="36"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-pink-400 drop-shadow-lg"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="currentColor"
              />
            </svg>
          </div>
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
            data-analytics="cta.landing.read_history"
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

      {/* ============ FREE / DONATE ============ */}
      <section className="landing-section landing-section--alt" id="pricing">
        <div className="landing-section__container">
          <RevealBox><h2 className="landing-section__title">Всё полностью бесплатно</h2></RevealBox>
          <RevealBox><p className="landing-section__subtitle">Никаких планов и подписок — все функции доступны сразу.</p></RevealBox>

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
                  data-analytics={plan.donate ? "cta.landing.donate" : "cta.landing.start_now"}
                  onClick={() => plan.donate ? (apiTrackEvent('donate_page_open'), setIsDonateOpen(true)) : navigate("/tier-lists/new")}
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

      {isDonateOpen && (
        <DonateModal onClose={() => setIsDonateOpen(false)} />
      )}

      {activeScreenshot != null && (
        <Lightbox
          screenshot={screenshots[activeScreenshot]}
          onClose={() => setActiveScreenshot(null)}
        />
      )}
    </>
  )
}

/* ---------- Inline icon helper ---------- */
function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
