import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { sileo } from 'sileo';
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import TemplateBuilder from "../components/TemplateBuilder/TemplateBuilder";
import { useCreateTemplate } from "../hooks/useTemplates";
import type { CreateTemplateData, UpdateTemplateData } from "../types/templates";

const CreateTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { mutateAsync: createTemplate } = useCreateTemplate();
  const location = useLocation();
  const prefillTemplate =
    (location.state as { prefillTemplate?: CreateTemplateData } | null)
      ?.prefillTemplate ?? undefined;

  const handleSave = async (data: CreateTemplateData | UpdateTemplateData) => {
    if (!data.title || !data.tiers) {
      sileo.error({ title: "Ошибка сохранения полей" });
      return;
    }

    const payload: CreateTemplateData = {
      title: data.title,
      description: data.description,
      tiers: data.tiers,
      defaultBooks: data.defaultBooks,
      isPublic: data.isPublic,
    };

    try {
      await createTemplate(payload);
      sileo.success({ title: "Шаблон успешно создан" });
      navigate("/templates");
    } catch {
      sileo.error({ title: "Произошла ошибка при создании шаблона. Пожалуйста, попробуйте еще раз." });
    }
  };

  const handleCancel = () => {
    navigate("/templates");
  };

  const handleMyRatingsClick = () => {
    navigate("/");
  };

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      showTemplatesNav={false}
      showSearch={false}
    >
      <main className="relative flex-1 overflow-y-auto min-h-screen bg-[url('/templates.webp')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(10,10,10,0.84)_0%,rgba(18,18,18,0.78)_45%,rgba(10,10,10,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(217,79,43,0.18),transparent_36%),radial-gradient(circle_at_84%_78%,rgba(47,107,95,0.18),transparent_40%)]" />

        <div className="relative overflow-hidden px-4 pt-8 pb-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCancel}
                className="group flex w-full items-center justify-center gap-2 rounded-md border border-white/30 bg-black/40 px-4 py-2 text-[#f3efe6] transition-colors duration-200 hover:border-white/55 hover:bg-black/55 cursor-pointer sm:w-auto"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">К шаблонам</span>
              </button>
              <button
                onClick={handleMyRatingsClick}
                className="group flex w-full items-center justify-center gap-2 rounded-md border border-white/30 bg-black/40 px-4 py-2 text-[#f3efe6] transition-colors duration-200 hover:border-white/55 hover:bg-black/55 cursor-pointer sm:w-auto"
              >
                <Home size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium">На главную</span>
              </button>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-[#f3efe6] mb-1">
              Создание шаблона
            </h1>
            <p className="text-sm text-[#b8b1a3]">
              Создайте шаблон для быстрого использования рейтингов tier-списков
            </p>
          </div>
        </div>

        <div className="relative px-4 pb-12 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <TemplateBuilder
              onSave={handleSave}
              onCancel={handleCancel}
              isEditing={false}
              template={prefillTemplate}
            />
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
};

export default CreateTemplatePage;
