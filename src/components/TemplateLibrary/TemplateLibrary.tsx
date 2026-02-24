import React, { useRef, useState } from "react";
import { FileText, Plus, Compass } from "lucide-react";
import { useUserTemplates, useDeleteTemplate } from "../../hooks/useTemplates";
import TemplateCard from "../TemplateCard/TemplateCard";
import { Button } from "../../ui/Button";
import { useNavigate } from "react-router-dom";
import type { Template } from "../../types/templates";
import { sileo } from 'sileo';
import { DeleteTemplateModal } from "./DeleteTemplateModal";
import { Spinner } from "@/components/Spinner";

const TemplateLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { data: templates, isLoading, isError, refetch } = useUserTemplates();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const deleteIdRef = useRef<string | null>(null);

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    deleteIdRef.current = template.id;
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    const id = deleteIdRef.current;
    if (!id) return;

    deleteTemplate(id, {
      onSuccess: () => {
        sileo.success({ title: "Шаблон успешно удалён" });
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
        deleteIdRef.current = null;
      },
      onError: () => {
        sileo.error({ title: "Не удалось удалить шаблон. Попробуйте снова." });
      },
    });
  };

  const handleEdit = (template: Template) => {
    navigate(`/templates/${template.id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 bg-black/35 border border-white/20 rounded-md">
        <p className="text-red-300 mb-4">
          Ошибка загрузки шаблонов. Пожалуйста, попробуйте снова.
        </p>
        <Button onClick={() => refetch()} variant="primary">
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <>
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2 md:p-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-black/30 border border-white/20 rounded-md">
          <div className="mb-6">
            <FileText size={56} className="text-[#b8b1a3] mx-auto" />
          </div>
          <h3 className="font-display text-xl font-medium text-[#f3efe6] mb-2">
            Пока нет шаблонов
          </h3>
          <p className="text-[#b8b1a3] mb-6">
            Вы ещё не создали ни одного шаблона. Начните с создания первого шаблона.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => navigate("/templates/new")}
              variant="primary"
              className="transition-transform hover:scale-105 active:scale-95"
            >
              <Plus size={18} className="mr-2" />
              Создать первый шаблон
            </Button>
            <div className="text-[#b8b1a3] text-sm mt-4">
              или
            </div>
            <Button
              onClick={() => navigate("/templates/all")}
              variant="outline"
              className="transition-transform hover:scale-105 active:scale-95"
            >
              <Compass size={18} className="mr-2" />
              Просмотреть все шаблоны
            </Button>
          </div>
        </div>
      )}

      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
          deleteIdRef.current = null;
        }}
        onConfirm={handleDeleteConfirm}
        templateTitle={templateToDelete?.title || ""}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default TemplateLibrary;
