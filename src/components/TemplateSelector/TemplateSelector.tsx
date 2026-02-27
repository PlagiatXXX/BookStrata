import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Lock, CheckCircle, Plus, Play } from "lucide-react";
import { useTemplates, useApplyTemplate } from "../../hooks/useTemplates";
import { Button } from "../../ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../../ui/Dialog";
import type { Template } from "../../types/templates";
import { Spinner } from "@/components/Spinner";
import { sileo } from 'sileo';

interface TemplateSelectorProps {
  onSelect: (template: Template | null) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const { data: templates, isLoading, isError } = useTemplates();
  const { mutateAsync: applyTemplate } = useApplyTemplate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedTemplateId(null);
      setCustomTemplateName("");
      setIsUsingTemplate(false);
    }
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplateId) return;

    const template = templates?.find((item) => item.id === selectedTemplateId) ?? null;
    onSelect(template);

    setIsUsingTemplate(true);
    try {
      const result = await applyTemplate({
        id: selectedTemplateId,
        newListTitle: customTemplateName.trim() || undefined,
      });

      sileo.success({ title: "Шаблон успешно применен!", duration: 3000 });
      setIsOpen(false);
      navigate(`/tier-lists/${result.id}`);
    } catch {
      sileo.error({ 
        title: "Не удалось создать тир-лист", 
        description: "Попробуйте снова позже",
        duration: 3000 
      });
    } finally {
      setIsUsingTemplate(false);
    }
  };

  const handleCreateBlank = () => {
    onSelect(null);
    setIsOpen(false);
  };

  const handleViewAllTemplates = () => {
    setIsOpen(false);
    setTimeout(() => {
      navigate("/templates");
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary" className="text-sm font-semibold">
          Создать из шаблона
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle>Выберите шаблон</DialogTitle>
              <DialogDescription>Загружаем доступные шаблоны…</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center items-center py-8">
              <Spinner size="lg" />
            </div>
          </>
        ) : isError ? (
          <>
            <DialogHeader>
              <DialogTitle>Ошибка загрузки шаблонов</DialogTitle>
              <DialogDescription>
                Не удалось загрузить шаблоны. Пожалуйста, попробуйте позже.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Закрыть
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Выберите шаблон</DialogTitle>
              <DialogDescription>
                Можно сразу применить готовый шаблон или создать пустой тир-лист.
              </DialogDescription>
            </DialogHeader>

            <div className="mb-4 shrink-0">
              <label className="block text-sm font-medium text-[#f3efe6] mb-2">
                Название тир-листа (необязательно)
              </label>
              <input
                type="text"
                value={customTemplateName}
                onChange={(e) => setCustomTemplateName(e.target.value)}
                placeholder="Оставьте пустым, чтобы использовать название шаблона"
                className="w-full px-3 py-2 border border-white/25 rounded-md bg-black/35 text-[#f3efe6] placeholder:text-[#b8b1a3] focus:outline-none focus:ring-2 focus:ring-(--accent-main)"
              />
            </div>

            {templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`group relative flex flex-col h-full border rounded-md p-3 cursor-pointer transition-colors duration-200 ${
                      selectedTemplateId === template.id
                        ? "border-(--accent-main) bg-[rgba(217,79,43,0.13)] ring-1 ring-(--accent-main)/30"
                        : "border-white/20 bg-black/30 hover:bg-black/45 hover:border-white/35"
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="flex justify-between items-start shrink-0 gap-2">
                      <h3 className="font-semibold text-[#f3efe6] text-sm truncate pr-2">
                        {template.title}
                      </h3>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded shrink-0 inline-flex items-center gap-1 border ${
                          template.isPublic
                            ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                            : "bg-amber-500/20 text-amber-200 border-amber-400/40"
                        }`}
                      >
                        {template.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                        {template.isPublic ? "Публ." : "Прив."}
                      </span>
                    </div>

                    {template.description && (
                      <div className="mt-2 mb-2 min-h-10 max-h-15 overflow-hidden shrink-0">
                        <p className="text-xs text-[#b8b1a3] whitespace-pre-wrap wrap-break-word leading-tight">
                          {template.description}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto shrink-0">
                      <div className="flex flex-wrap gap-1">
                        {template.tiers.slice(0, 4).map((tier, index) => (
                          <span
                            key={tier.id || index}
                            className="inline-flex items-center text-xs px-1.5 py-0.5 rounded transition-transform hover:scale-105"
                            style={{
                              backgroundColor: `${tier.color}30`,
                              color: tier.color,
                              border: `1px solid ${tier.color}50`,
                            }}
                          >
                            {tier.name}
                          </span>
                        ))}
                        {template.tiers.length > 4 && (
                          <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-white/10 text-[#b8b1a3] border border-white/20">
                            +{template.tiers.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-[#b8b1a3] text-right shrink-0">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </div>

                    {selectedTemplateId === template.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={16} className="text-(--accent-main)" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#b8b1a3] mb-4">
                  У вас пока нет шаблонов.
                </p>
                <Button onClick={handleCreateBlank} variant="outline">
                  Создать пустой тир-лист
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4 mt-4 border-t border-white/20 shrink-0 gap-2 flex-wrap">
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateBlank}
                className="text-sm font-semibold"
              >
                <Plus size={16} className="mr-2" />
                Создать пустой
              </Button>

              <div className="space-x-2 flex items-center flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleViewAllTemplates}
                  className="text-sm font-semibold"
                >
                  Все шаблоны
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold"
                >
                  Отмена
                </Button>

                <Button
                  type="button"
                  onClick={handleUseTemplate}
                  disabled={!selectedTemplateId || isUsingTemplate}
                  className="text-sm font-semibold"
                >
                  {isUsingTemplate ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Play size={14} className="mr-2" />
                  )}
                  Использовать
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;
