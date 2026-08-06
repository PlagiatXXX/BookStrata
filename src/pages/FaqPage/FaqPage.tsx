import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ChevronDown, CircleHelp } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Footer } from "@/ui/Footer";

// Единый источник правды: текст на странице и JSON-LD генерируются из него,
// чтобы разметка никогда не разъезжалась с видимым контентом.
const FAQ_ITEMS = [
  {
    question: "Что такое BookStrata?",
    answer: "Это сервис для создания книжных топов в красивых тир-листах.",
  },
  {
    question: "Это бесплатно?",
    answer:
      "Да, все функции абсолютно бесплатны, но есть возможность поддержать автора.",
  },
  {
    question: "Как создать свой тир-лист?",
    answer:
      "После регистрации на главной странице нажмите «Создать тир-лист», добавьте книги через поиск книг и распределите их по полкам от лучших к худшим. Сохраните — тир-лист появится в профиле.",
  },
  {
    question: "Что такое рейтинги книг и подборки?",
    answer:
      "Это редакционные подборки книг, составленные командой BookStrata по жанрам и темам. Отличаются от тир-листов тем, что их создает редакция, а не пользователи.",
  },
  {
    question: "Как работает ИИ-библиотекарь «Букстраж»?",
    answer:
      "На страницах тир-листов и коллекций есть кнопка «Спросить у Букстража»: он анализирует книги в подборке или в личном тир-листе и рекомендует, что читать дальше по вкусу.",
  },
  {
    question: "Могу ли я редактировать чужие тир-листы?",
    answer:
      "Нет, только автор может редактировать. Можно ставить лайки и использовать как шаблон.",
  },
  {
    question: "Что делать, если я нашел ошибку, баг или просто хочу оставить отзыв?",
    answer:
      "Справа снизу экрана есть виджет обратной связи, любые пожелания и замечания вы можете оставлять там, в этот же день ваше обращение будет рассмотрено.",
  },
] as const;

export default function FaqPage() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Аккордеон: открыт один вопрос (null — все закрыты)
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen px-6 py-14 pb-20">
      <SEOHead
        title="Вопросы и ответы — FAQ по BookStrata"
        description="Ответы на частые вопросы о BookStrata: что такое тир-листы, бесплатно ли это, как создать свой рейтинг книг, как работает ИИ-библиотекарь «Букстраж» и как оставить отзыв."
        url="/faq"
        breadcrumbs={[{ name: "Главная", url: "/" }, { name: "Вопросы и ответы", url: "/faq" }]}
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Вопросы и ответы" }]} />

        {/* Назад */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Назад
        </button>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-(--accent-main)/10 border border-(--accent-main)/20 flex items-center justify-center shrink-0 mt-1">
            <CircleHelp size={24} className="text-(--accent-main)" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-(--ink-0)">
              Вопросы и ответы
            </h1>
            <p className="text-sm text-(--ink-2) mt-1">
              Собрали ответы на частые вопросы о BookStrata. Не нашли свой — напишите нам через виджет обратной связи.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className={`rounded-2xl border transition-colors ${
                  isOpen
                    ? "border-(--accent-main)/30 bg-(--bg-2)"
                    : "border-(--line-soft) bg-(--bg-0)"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold text-(--ink-0)">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-(--ink-2) transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-(--ink-1)">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Footer />
    </div>
  );
}
