import React from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Trash2, Play } from "lucide-react";
import type { Template } from "../../types";
import { Button } from "../../ui/Button";
import { useApplyTemplate } from "../../hooks/useTemplates";
import { useAuth } from "@/hooks/useAuthContext";
import { LikeButton } from "../LikeButton";
import { Spinner } from "@/components/Spinner";
import { sileo } from "sileo";

interface TemplateCardProps {
  template: Template;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  showEditDelete?: boolean;
  variant?: "default" | "cover";
  coverHeight?: number;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  showEditDelete = true,
  variant = "default",
  coverHeight,
}) => {
  const navigate = useNavigate();
  const { mutateAsync: applyTemplate, isPending } = useApplyTemplate();
  const { user } = useAuth();
  const currentUserId = user?.userId;

  const handleDeleteClick = () => {
    onDelete?.(template);
  };

  const handleUseTemplate = async () => {
    try {
      const result = await applyTemplate({
        id: template.id,
        newListTitle: `${template.title} (from template)`,
      });
      sileo.success({ title: "Шаблон успешно применен!", duration: 3000 });
      navigate(`/tier-lists/${result.id}`);
    } catch {
      sileo.error({
        title: "Не удалось применить шаблон",
        description: "Попробуйте снова позже",
        duration: 3000,
      });
    }
  };

  const previewSrc =
    template.previewImageUrl || template.defaultBooks?.[0]?.coverImageUrl || "";

  if (variant === "cover") {
    return (
      <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[#0b3f52]/90 bg-[#072331] shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-1">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: `${coverHeight ?? 420}px` }}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={template.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(140deg,#2f6076_5%,#7f9967_44%,#332e2b_90%)]" />
          )}

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,15,23,0.95)_8%,rgba(5,15,23,0.25)_45%,rgba(5,15,23,0.02)_75%)]" />

          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            {showEditDelete && onEdit && onDelete && (
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Редактировать шаблон"
                  onClick={() => onEdit(template)}
                  className="rounded-md border border-white/35 bg-black/40 p-1.5 text-white transition-colors hover:bg-black/70"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Удалить шаблон"
                  onClick={handleDeleteClick}
                  className="rounded-md border border-white/35 bg-black/40 p-1.5 text-white transition-colors hover:bg-red-500/70"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-base font-semibold text-white">
              {template.title}
            </h3>
            {template.description && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-200/90">
                {template.description}
              </p>
            )}

            {/* Индикатор количества книг */}
            {template.defaultBooks && template.defaultBooks.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {template.defaultBooks.slice(0, 3).map((book, idx) => (
                    <div
                      key={book.id || idx}
                      className="h-8 w-6 flex-shrink-0 overflow-hidden rounded border-2 border-[#072331] shadow-sm"
                      title={book.title}
                    >
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-600" />
                      )}
                    </div>
                  ))}
                  {template.defaultBooks.length > 3 && (
                    <div className="flex h-8 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-medium text-white">
                      +{template.defaultBooks.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-300">
                  {template.defaultBooks.length} кн.
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <Button
                onClick={handleUseTemplate}
                disabled={isPending}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                {isPending ? <Spinner size="sm" /> : <Play size={12} />}
                <span>{isPending ? "Применение..." : "Использовать"}</span>
              </Button>
              <LikeButton
                id={template.id}
                type="template"
                initialLikes={template.likesCount || 0}
                authorId={
                  template.authorId
                    ? parseInt(template.authorId, 10)
                    : undefined
                }
                currentUserId={currentUserId}
                size="sm"
              />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="group relative flex h-full flex-col rounded-md border border-white/20 bg-black/45 p-4 backdrop-blur-[2px] transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/40">
      <div className="shrink-0 items-start justify-between sm:flex">
        <h3 className="truncate pr-2 font-display text-lg font-semibold text-[#f3efe6]">
          {template.title}
        </h3>
        {showEditDelete && onEdit && onDelete && (
          <div className="mt-2 flex shrink-0 space-x-1 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              aria-label="Редактировать шаблон"
              onClick={() => onEdit(template)}
              className="p-1 text-[#f3efe6] opacity-90 transition-opacity hover:opacity-100"
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              aria-label="Удалить шаблон"
              onClick={handleDeleteClick}
              className="p-1 opacity-90 transition-opacity hover:opacity-100"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      {template.description && (
        <div className="mb-2 mt-2 max-h-20 min-h-15 shrink-0 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#b8b1a3]">
            {template.description}
          </p>
        </div>
      )}

      {/* Превью книг из шаблона */}
      {template.defaultBooks && template.defaultBooks.length > 0 && (
        <div className="mb-3 shrink-0">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-[#b8b1a3]">
              Книги в шаблоне ({template.defaultBooks.length})
            </span>
            {template.type && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  template.type === "curated"
                    ? "bg-purple-500/20 text-purple-300"
                    : template.type === "community"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {template.type === "curated"
                  ? "Курированный"
                  : template.type === "community"
                    ? "Выбор сообщества"
                    : "Стартовый"}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-hidden">
            {template.defaultBooks.slice(0, 5).map((book, idx) => (
              <div
                key={book.id || idx}
                className="relative h-16 w-10 flex-shrink-0 overflow-hidden rounded shadow-md"
                title={`${book.title} — ${book.author}`}
              >
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-600 to-slate-800" />
                )}
              </div>
            ))}
            {template.defaultBooks.length > 5 && (
              <div className="flex h-16 w-10 flex-shrink-0 items-center justify-center rounded bg-white/10 text-xs font-medium text-[#b8b1a3]">
                +{template.defaultBooks.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto shrink-0">
        <div className="flex flex-wrap gap-1">
          {template.tiers.slice(0, 5).map((tier, index) => (
            <div
              key={tier.id || index}
              className="rounded px-2 py-0.5 text-xs font-medium transition-transform hover:scale-105"
              style={{ backgroundColor: tier.color, color: "white" }}
            >
              {tier.name}
            </div>
          ))}
          {template.tiers.length > 5 && (
            <div className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-[#b8b1a3]">
              +{template.tiers.length - 5}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 shrink-0">
        <Button
          onClick={handleUseTemplate}
          disabled={isPending}
          className="w-full transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              Применение...
            </>
          ) : (
            <>
              <Play size={14} />
              Использовать шаблон
            </>
          )}
        </Button>
      </div>

      <div className="mt-2 flex shrink-0 items-center justify-between text-xs text-[#b8b1a3]">
        <span>Создан: {new Date(template.createdAt).toLocaleDateString()}</span>
        <LikeButton
          id={template.id}
          type="template"
          initialLikes={template.likesCount || 0}
          authorId={
            template.authorId ? parseInt(template.authorId, 10) : undefined
          }
          currentUserId={currentUserId}
          size="sm"
        />
      </div>
    </div>
  );
};

export default TemplateCard;
