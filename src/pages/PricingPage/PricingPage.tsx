import { useState } from "react"
import { Heart, X, Check, Copy, Send, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs"
import { ShineBorder } from "@/ui/ShineBorder"
import { apiTrackEvent } from "@/lib/analyticsApi"
import "./PricingPage.css"

function DonateModal({ onClose }: { onClose: () => void }) {
  useBodyScrollLock(true)
  const [copied, setCopied] = useState(false)
  const cardNumber = '2202200609389554'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber)
      setCopied(true)
      window.ym?.(109755750, 'reachGoal', 'donate_copy')
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
      window.ym?.(109755750, 'reachGoal', 'donate_copy')
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
            <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
              <span className="font-mono text-base font-bold text-white tracking-wider">
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

const features = [
  "Безлимитные тир-листы",
  "Безлимит книг в тир-листе",
  "Все темы оформления",
  "Баттлы и обсуждения",
  "Кастомные обложки",
  "Экспорт PNG",
  "Букстраж (AI-рекомендации)",
  "Добавление книг через Google Books и LiveLib",
  "И многое другое",
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [showDonateModal, setShowDonateModal] = useState(false)

  return (
    <div className="pricing-page">
      <SEOHead
        title="Поддержать проект — BookStrata"
        description="BookStrata полностью бесплатен. Поддержите проект донатом, если он вам полезен. Все функции уже доступны без ограничений."
        url="/pricing"
        breadcrumbs={[{ name: "Поддержать", url: "/pricing" }]}
      />
      <div className="pricing-page__container">
        <div className="pricing-page__header">
          <button
            onClick={() => navigate(-1)}
            className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) mb-4 transition-colors self-start"
            type="button"
          >
            <ArrowLeft size={14} />
            Назад
          </button>
          <Breadcrumbs items={[{ label: "Поддержать" }]} />
          <h1 className="pricing-page__title">Поддержать проект</h1>
          <p className="pricing-page__subtitle">
            BookStrata полностью бесплатен — все функции доступны без ограничений.
            <br />
            Если проект вам полезен, поддержите его развитие любым донатом.
          </p>
        </div>

        <div className="pricing-page__grid">
          {/* Карточка возможностей */}
          <div className="pricing-card">
            <div className="pricing-card__body">
              <div className="pricing-card__name">
                <svg width="24" height="24" viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <rect x="0" y="0" width="36" height="6" rx="3" fill="#8B7CFF" />
                  <rect x="0" y="10" width="28" height="6" rx="3" fill="#6D5DF6" />
                  <rect x="0" y="20" width="20" height="6" rx="3" fill="#4C3FFF" />
                </svg>
                BookStrata
              </div>
              <div className="pricing-card__free-badge">Всё бесплатно</div>
              <p className="pricing-card__description">
                Все возможности проекта доступны без подписок и ограничений.
              </p>
              <ul className="pricing-card__features">
                {features.map((text) => (
                  <li key={text} className="pricing-card__feature">
                    <span className="pricing-card__check">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Карточка доната */}
          <div className="pricing-card pricing-card--donate">
            <ShineBorder
              shineColor="#fbbf24"
              borderWidth={2}
              duration={12}
            />
            <div className="pricing-card__body">
              <div className="pricing-card__name">
                <Heart size={18} className="text-amber-300" />
                Донат
              </div>
              <div className="pricing-card__price">
                <span className="pricing-card__amount">Любая</span>
                <span className="pricing-card__period">сумма</span>
              </div>
              <p className="pricing-card__description">
                Поддержите развитие проекта
              </p>
              <button
                onClick={() => { apiTrackEvent('donate_page_open'); setShowDonateModal(true) }}
                className="pricing-card__cta pricing-card__cta--donate cursor-pointer"
                type="button"
              >
                Поддержать
              </button>
              <ul className="pricing-card__features">
                <li className="pricing-card__feature">
                  <span className="pricing-card__check">✓</span>
                  <span>+100 к карме</span>
                </li>
                <li className="pricing-card__feature">
                  <span className="pricing-card__check">✓</span>
                  <span>Бейдж мецената</span>
                </li>
                <li className="pricing-card__feature">
                  <span className="pricing-card__check">✓</span>
                  <span>Имя в списке спонсоров</span>
                </li>
                <li className="pricing-card__feature">
                  <span className="pricing-card__check">✓</span>
                  <span>Ранний доступ к фичам</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showDonateModal && (
        <DonateModal onClose={() => setShowDonateModal(false)} />
      )}
    </div>
  )
}
