import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Copy, Check, ShieldCheck, Clock, FileText } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";

const LEGAL_EMAIL = "legal@bookstrata.ru";

export default function CopyrightPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(LEGAL_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = LEGAL_EMAIL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4">
      <SEOHead
        title="Информация для правообладателей — BookStrata"
        description="Правила использования материалов, правовой статус информационного посредника и порядок направления обращений правообладателей на BookStrata (ст. 1274, 1253.1 ГК РФ)."
        url="/copyright"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Для правообладателей", url: "/copyright" },
        ]}
      />
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Назад
        </button>
        <Breadcrumbs items={[{ label: "Для правообладателей" }]} theme="light" />

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Информация для правообладателей
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Последнее обновление: {new Date().toLocaleDateString("ru-RU")}
        </p>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Статус информационного посредника */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-1">
                  Статус информационного посредника
                </h2>
                <p>
                  Проект BookStrata является информационно-справочным книжным каталогом и платформой для
                  систематизации читательского опыта (создания пользовательских рейтингов и тир-листов).
                  Сайт <strong>не распространяет</strong> электронные или печатные копии книг, не
                  предоставляет ссылки на пиратские ресурсы и не осуществляет коммерческую продажу
                  объектов авторского права.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Деятельность сервиса осуществляется в строгом соответствии со ст. 1253.1 ГК РФ
                  (Особенности ответственности информационного посредника).
                </p>
              </div>
            </div>
          </section>

          {/* Принципы использования материалов */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-slate-600" />
              Принципы использования материалов (ст. 1274 ГК РФ)
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Библиографические данные и факты:</strong> имена авторов, названия
                произведений, годы издания, ISBN и издательские характеристики носят справочный характер.
              </li>
              <li>
                <strong>Изображения обложек:</strong> используются в уменьшенном разрешении
                исключительно для визуальной идентификации произведений в информационных, культурных и
                ознакомительных целях (п. 1 ст. 1274 ГК РФ).
              </li>
              <li>
                <strong>Аннотации и цитаты:</strong> приводятся в объеме, оправданном целью
                цитирования и ознакомления с произведением, с обязательным указанием авторства и источника.
              </li>
            </ul>
          </section>

          {/* Порядок обращения правообладателей */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Порядок обращения правообладателей
            </h2>
            <p className="mb-3">
              Мы уважаем авторские и смежные права. Если вы являетесь законным правообладателем
              какого-либо материала, размещенного на сайте, и считаете, что ваши права нарушены (или
              желаете скорректировать информацию о книге), пожалуйста, свяжитесь с нами по электронной
              почте:
            </p>
            <p className="font-medium text-slate-800 mb-2">
              Для оперативного рассмотрения заявки просим указать в письме:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Прямую ссылку (URL) на страницу сайта с объектом спора.</li>
              <li>
                Документальное подтверждение ваших прав на материал (или ссылку на официальный сайт
                издательства/автора).
              </li>
              <li>Суть требования (удаление изображения обложки, корректировка текста и т.д.).</li>
            </ol>
          </section>

          {/* Плашка сроков рассмотрения */}
          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">
                  Срок рассмотрения обращений — до 48 часов
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Администрация сайта рассматривает обращения и принимает необходимые меры в течение
                  48 часов с момента получения корректно оформленного запроса в соответствии с нормами
                  ст. 1253.1 ГК РФ.
                </p>
              </div>
            </div>
          </section>

          {/* Блок контактов */}
          <section className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Контакты для правообладателей</h2>
            <p className="mb-4">
              Направьте ваше обращение на официальный почтовый адрес юридической службы BookStrata:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${LEGAL_EMAIL}?subject=%D0%9E%D0%B1%D1%80%D0%B0%D1%89%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D0%BE%D0%B1%D0%BB%D0%B0%D0%B4%D0%B0%D1%82%D0%B5%D0%BB%D1%8F`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <Mail size={16} />
                {LEGAL_EMAIL}
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                aria-label="Копировать email"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied ? "Скопировано" : "Копировать email"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
