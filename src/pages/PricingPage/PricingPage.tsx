import { useState } from "react"
import { ArrowLeft, Crown, CreditCard, Send, X, Copy, Check } from "lucide-react"
import { useAuth } from "@/hooks/useAuthContext"
import { useNavigate } from "react-router-dom"
import "./PricingPage.css"

const plans = [
  {
    name: "Free",
    price: "0",
    period: "навсегда",
    description: "Попробуйте BookStrata, чтобы понять, насколько это увлекательно",
    features: [
      { text: "До 5 тир-листов", included: true },
      { text: "До 20 книг в тир-листе", included: true },
      { text: "Базовые темы оформления", included: true },
      { text: "Участие в баттлах (1/нед)", included: true },
      { text: "Коллаж из книг на обложке", included: true },
      { text: "Кастомные обложки тир-листов", included: false },
      { text: "Экспорт PNG / PDF", included: true },
      { text: "Кастомные темы оформления", included: false },
      { text: "Аналитика и статистика", included: false },
      { text: "Бейдж Pro в профиле", included: false },
      { text: "ИИ-библиотекарь (рекомендации книг)", included: false },
    ],
    cta: "Начать бесплатно",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "300",
    period: "в месяц",
    description: "Для тех, кто живёт книгами и хочет больше возможностей",
    features: [
      { text: "Безлимитные тир-листы", included: true },
      { text: "Безлимит книг в тир-листе", included: true },
      { text: "Базовые темы оформления", included: true },
      { text: "Участие в баттлах (безлимит)", included: true },
      { text: "Коллаж из книг на обложке", included: true },
      { text: "Кастомные обложки тир-листов ✓", included: true },
      { text: "Экспорт PNG / PDF", included: true },
      { text: "Эксклюзивные темы оформления ✓", included: true },
      { text: "Аналитика и статистика ✓", included: true },
      { text: "Бейдж Pro + корона в профиле", included: true },
      { text: "ИИ-библиотекарь (рекомендации книг)", included: true },
    ],
    cta: "Оформить Pro",
    highlighted: true,
  },
]

function PaymentModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const cardNumber = '2202 2074 5545 2840'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = cardNumber
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#c1fffe]/20 bg-[#111] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:border-[#c1fffe]/30 hover:text-white"
          type="button"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#c1fffe]/30 bg-[#c1fffe]/10">
            <CreditCard className="h-5 w-5 text-[#c1fffe]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Оформление Pro</h2>
            <p className="text-sm text-gray-400">
              300 ₽ / месяц
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-sm font-medium text-green-400 mb-2">
              Реквизиты для перевода
            </p>
            <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
              <span className="font-mono text-base font-bold text-white tracking-wider">
                {cardNumber}
              </span>
              <button
                onClick={handleCopy}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#c1fffe]/30 hover:text-[#c1fffe]"
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
              Получатель: Федор П.
            </p>
          </div>

          <div className="rounded-xl border border-[#c1fffe]/20 bg-[#c1fffe]/5 p-4">
            <p className="text-sm font-medium text-[#c1fffe] mb-2">
              После оплаты
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Напишите в Telegram{' '}
              <a
                href="https://t.me/PasFedor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#c1fffe] underline underline-offset-2 hover:text-white transition-colors"
              >
                <Send size={14} />
                @PasFedor
              </a>
              {' '}— активирую Pro в течение часа.
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            После активации подписка будет действовать 30 дней с момента подтверждения
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full cursor-pointer rounded-xl border-2 border-[#c1fffe]/30 bg-[#c1fffe]/10 px-6 py-3 text-sm font-bold text-[#c1fffe] transition-colors hover:bg-[#c1fffe]/20"
          type="button"
        >
          Понятно, спасибо
        </button>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handleCta = (planName: string) => {
    if (planName === "Free") {
      navigate(isAuthenticated ? "/" : "/auth")
      return
    }
    if (!isAuthenticated) {
      navigate("/auth")
      return
    }
    setShowPaymentModal(true)
  }

  const currentPlan = user?.isPro ? "Pro" : "Free"

  return (
    <div className="pricing-page">
      <div className="pricing-page__container">
        <div className="pricing-page__header">
          <button
            onClick={() => navigate("/")}
            className="pricing-page__back"
            type="button"
            aria-label="На главную"
          >
            <ArrowLeft size={20} />
            На главную
          </button>
          <h1 className="pricing-page__title">Выберите свой план</h1>
          <p className="pricing-page__subtitle">
            Создавайте, сравнивайте и делитесь книжными рейтингами —
            <br />
            с Pro вы получаете максимум возможностей
          </p>
        </div>

        <div className="pricing-page__grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card ${plan.highlighted ? "pricing-card--pro" : ""} ${currentPlan === plan.name ? "pricing-card--current" : ""}`}
            >
              {plan.highlighted && (
                <div className="pricing-card__badge">Популярное</div>
              )}

              <div className="pricing-card__body">
                <h2 className="pricing-card__name">
                  {plan.highlighted && <Crown size={18} className="pricing-card__crown" />}
                  {plan.name}
                </h2>

                <div className="pricing-card__price">
                  <span className="pricing-card__amount">{plan.price} ₽</span>
                  <span className="pricing-card__period">/{plan.period}</span>
                </div>

                <p className="pricing-card__description">{plan.description}</p>

                <button
                  onClick={() => handleCta(plan.name)}
                  className={`pricing-card__cta ${plan.highlighted ? "pricing-card__cta--pro" : ""}`}
                  type="button"
                >
                  {currentPlan === plan.name && plan.highlighted
                    ? "Текущий план"
                    : plan.cta}
                </button>

                <ul className="pricing-card__features">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={`pricing-card__feature ${feature.included ? "" : "pricing-card__feature--muted"}`}
                    >
                      <span className="pricing-card__check">
                        {feature.included ? "✓" : "—"}
                      </span>
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  )
}
