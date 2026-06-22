import { useNavigate } from "react-router-dom";
import { BookOpen, Home } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead title="Страница не найдена" description="Запрашиваемая страница не найдена на BookStrata" url="/404" noindex />
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
        <div className="neo-brutalist-card mx-auto flex max-w-lg flex-col items-center p-8 text-center">
          <h1 className="mb-4 text-4xl font-black text-[#f3efe6]">Страница не найдена</h1>

        <img
          src="/404.webp"
          alt="Букстраж"
          className="mb-6 size-60 rounded-2xl border-4 border-black object-cover shadow-[8px_8px_0_0_#000]"
        />

        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="nb-btn-secondary flex cursor-pointer items-center gap-2"
            type="button"
          >
            <BookOpen size={16} />
            Назад
          </button>

          <button
            onClick={() => navigate("/")}
            className="nb-btn-primary flex cursor-pointer items-center gap-2"
            type="button"
          >
            <Home size={16} />
            На главную
          </button>
        </div>

        <p className="mt-8 text-[10px] text-gray-600/60">
          PS: Букстраж одобряет возвращение на главную
        </p>
      </div>
    </div>
    </>
  );
}
