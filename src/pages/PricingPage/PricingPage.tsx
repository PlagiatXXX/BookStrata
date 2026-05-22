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
    ],
    cta: "Начать бесплатно",
    highlighted: false,
  },
  {
    name: "Bookworm",
    price: "5",
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
    ],
    cta: "Оформить Pro",
    highlighted: true,
  },
]

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const handleCta = (planName: string) => {
    if (planName === "Free") {
      navigate(isAuthenticated ? "/" : "/auth")
      return
    }
    navigate(isAuthenticated ? "/pricing" : "/auth")
  }

  const currentPlan = user?.isPro ? "Bookworm" : "Free"

  return (
    <div className="pricing-page">
      <div className="pricing-page__container">
        <div className="pricing-page__header">
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
                <h2 className="pricing-card__name">{plan.name}</h2>

                <div className="pricing-card__price">
                  <span className="pricing-card__amount">${plan.price}</span>
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
    </div>
  )
}
