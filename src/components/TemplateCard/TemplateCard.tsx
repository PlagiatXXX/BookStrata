import React from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Trash2, Globe, Lock, Play } from "lucide-react";
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
      sileo.error({ title: "Не удалось применить шаблон. Попробуйте снова.", duration: 3000 });
    }
  };

  const previewSrc = template.previewImageUrl || template.defaultBooks?.[0]?.cover_image_url || "";

  if (variant === "cover") {
    return (
      <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[#0b3f52]/90 bg-[#072331] shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-1">
        <div className="relative w-full overflow-hidden" style={{ height: `${coverHeight ?? 420}px` }}>
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
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur ${
                template.isPublic
                  ? "border-emerald-300/50 bg-emerald-500/25 text-emerald-100"
                  : "border-sky-300/50 bg-sky-500/25 text-sky-100"
              }`}
            >
              {template.isPublic ? "Публичный" : "Частный"}
            </span>
            {showEditDelete && onEdit && onDelete && (
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Edit template"
                  onClick={() => onEdit(template)}
                  className="rounded-md border border-white/35 bg-black/40 p-1.5 text-white transition-colors hover:bg-black/70"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Delete template"
                  onClick={handleDeleteClick}
                  className="rounded-md border border-white/35 bg-black/40 p-1.5 text-white transition-colors hover:bg-red-500/70"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-base font-semibold text-white">{template.title}</h3>
            {template.description && <p className="mt-1 text-xs text-slate-200/90">{template.description}</p>}
            <div className="mt-3 flex items-center gap-2">
              <Button onClick={handleUseTemplate} disabled={isPending} size="sm" className="h-8 px-3 text-xs">
                {isPending ? <Spinner size="sm" /> : <Play size={12} />}
                <span>{isPending ? "Применение..." : "Использовать"}</span>
              </Button>
              <LikeButton
                id={template.id}
                type="template"
                initialLikes={template.likesCount || 0}
                authorId={template.authorId ? parseInt(template.authorId, 10) : undefined}
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
        <h3 className="truncate pr-2 font-display text-lg font-semibold text-[#f3efe6]">{template.title}</h3>
        {showEditDelete && onEdit && onDelete && (
          <div className="mt-2 flex shrink-0 space-x-1 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
              className="p-1 text-[#f3efe6] opacity-90 transition-opacity hover:opacity-100"
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="p-1 opacity-90 transition-opacity hover:opacity-100"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${
            template.isPublic
              ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
              : "border-amber-400/50 bg-amber-500/20 text-amber-200"
          }`}
        >
          {template.isPublic ? <Globe size={12} /> : <Lock size={12} />}
          {template.isPublic ? "Публичный" : "Частный"}
        </span>
      </div>

      {template.description && (
        <div className="mb-2 mt-2 max-h-20 min-h-15 shrink-0 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#b8b1a3]">{template.description}</p>
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
          authorId={template.authorId ? parseInt(template.authorId, 10) : undefined}
          currentUserId={currentUserId}
          size="sm"
        />
      </div>
    </div>
  );
};

export default TemplateCard;
