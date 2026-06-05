import { useNavigate } from "react-router-dom";
import { BookOpen, Home } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
      <div className="neo-brutalist-card mx-auto flex max-w-lg flex-col items-center p-8 text-center">
        {/* Placeholder for BookStratch — заменить на <img /> позже */}
        <div className="mb-6 flex size-40 items-center justify-center rounded-2xl border-4 border-black bg-[#0e1628] shadow-[8px_8px_0_0_#000]">
          <BookOpen
            size={64}
            className="text-[#c1fffe]"
            strokeWidth={1.5}
          />
        </div>

        <h1 className="nb-display mb-2 text-6xl font-black tracking-tighter text-white">
          404
        </h1>

        <p className="nb-label-md mb-2 text-gray-400">
          Книжный червь заблудился
        </p>

        <p className="mb-8 max-w-sm text-sm leading-relaxed text-gray-500">
          Страница, которую вы ищете, не найдена. Возможно, её съел BookStratch
          или она никогда не существовала.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="nb-btn-secondary flex items-center gap-2"
            type="button"
          >
            <BookOpen size={16} />
            Назад
          </button>

          <button
            onClick={() => navigate("/")}
            className="nb-btn-primary flex items-center gap-2"
            type="button"
          >
            <Home size={16} />
            На главную
          </button>
        </div>

        <p className="mt-8 text-[10px] text-gray-600/60">
          PS: BookStratch одобряет возвращение на главную
        </p>
      </div>
    </div>
  );
}
