/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { useTemplate, useUpdateTemplate } from "../hooks/useTemplates";
import TemplateBuilder from "../components/TemplateBuilder/TemplateBuilder";

const EditTemplatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, isError } = useTemplate(id!);
  const { mutateAsync: updateTemplate } = useUpdateTemplate();

  const handleSave = async (data: any) => {
    try {
      await updateTemplate({ id: id!, data });
      toast.success("Шаблон успешно обновлен!");
      navigate("/templates");
    } catch {
      toast.error("Не удалось обновить шаблон. Попробуйте снова.");
    }
  };

  const handleCancel = () => {
    navigate("/templates");
  };

  const handleMyRatingsClick = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <DashboardLayout
        onMyRatingsClick={handleMyRatingsClick}
        showTemplatesNav={false}
        showSearch={false}
      >
        <main className="flex-1 overflow-y-auto bg-linear-to-br from-purple-900/40 via-background-dark to-cyan-900/40">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (isError || !template) {
    return (
      <DashboardLayout
        onMyRatingsClick={handleMyRatingsClick}
        showTemplatesNav={false}
        showSearch={false}
      >
        <main className="flex-1 overflow-y-auto bg-linear-to-br from-purple-900/40 via-background-dark to-cyan-900/40">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">
                Ошибка загрузки шаблона или шаблон не найден.
              </p>
              <button
                onClick={() => navigate("/templates")}
                className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600"
              >
                Вернуться к шаблонам
              </button>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      showTemplatesNav={false}
      showSearch={false}
    >
      <main className="flex-1 overflow-y-auto bg-linear-to-br from-purple-900/40 via-background-dark to-cyan-900/40">
        {/* Header Section */}
        <div className="relative overflow-hidden px-4 lg:px-8 pt-8 pb-4">
          {/* Decorative gradient blobs */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleCancel}
                className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 rounded-lg text-gray-300 hover:text-cyan-300 transition-all duration-300"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">К шаблонам</span>
              </button>
              <button
                onClick={handleMyRatingsClick}
                className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 rounded-lg text-gray-300 hover:text-cyan-300 transition-all duration-300"
              >
                <Home size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">На главную</span>
              </button>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold bg-linear-to-r from-white via-purple-200 to-cyan-300 bg-clip-text text-transparent mb-1">
              Редактировать шаблон
            </h1>
            <p className="text-sm text-gray-400">
              Измените настройки вашего шаблона
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 lg:px-8 pb-12">
          <div className="max-w-4xl mx-auto">
            <TemplateBuilder
              template={template}
              onSave={handleSave}
              onCancel={handleCancel}
              isEditing={true}
            />
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
};

export default EditTemplatePage;
