import React from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Trash2, Globe, Lock, Play } from "lucide-react";
import type { Template } from "../../types";
import { Button } from "../../ui/Button";
import { useApplyTemplate } from "../../hooks/useTemplates";
import { useAuth } from "@/hooks/useAuthContext";
import { LikeButton } from "../LikeButton";
import { Spinner } from "@/components/Spinner";
import { sileo } from 'sileo';

interface TemplateCardProps {
  template: Template;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  showEditDelete?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  showEditDelete = true,
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
      sileo.success({ title: "Шаблон успешно применен!" });
      navigate(`/tier-lists/${result.id}`);
    } catch {
      sileo.error({ title: "Не удалось применить шаблон. Попробуйте снова." });
    }
  };

  return (
    <div className="group relative flex flex-col h-full rounded-md border border-white/20 bg-black/45 backdrop-blur-[2px] p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/40">
      <div className="flex justify-between items-start shrink-0">
        <h3 className="font-display font-semibold text-lg text-[#f3efe6] truncate pr-2">
          {template.title}
        </h3>
        {showEditDelete && onEdit && onDelete && (
          <div className="flex space-x-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
              className="opacity-90 hover:opacity-100 transition-opacity p-1 border-white/30 text-[#f3efe6]"
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="opacity-90 hover:opacity-100 transition-opacity p-1"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 shrink-0">
        <span
          className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 border ${
            template.isPublic
              ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/50"
              : "bg-amber-500/20 text-amber-200 border-amber-400/50"
          }`}
        >
          {template.isPublic ? <Globe size={12} /> : <Lock size={12} />}
          {template.isPublic ? "Публичный" : "Частный"}
        </span>
      </div>

      {template.description && (
        <div className="mt-2 mb-2 min-h-15 max-h-20 overflow-y-auto shrink-0">
          <p className="text-[#b8b1a3] text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
            {template.description}
          </p>
        </div>
      )}

      <div className="mt-auto shrink-0">
        <div className="flex flex-wrap gap-1">
          {template.tiers.slice(0, 5).map((tier, index) => (
            <div
              key={tier.id || index}
              className="px-2 py-0.5 rounded text-xs font-medium transition-transform hover:scale-105"
              style={{ backgroundColor: tier.color, color: "white" }}
            >
              {tier.name}
            </div>
          ))}
          {template.tiers.length > 5 && (
            <div className="px-2 py-0.5 rounded bg-white/10 text-xs text-[#b8b1a3] border border-white/20">
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

      <div className="mt-2 flex items-center justify-between text-xs text-[#b8b1a3] shrink-0">
        <span>
          Создан: {new Date(template.createdAt).toLocaleDateString()}
        </span>
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
