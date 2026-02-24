import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import TemplateCard from "@/components/TemplateCard/TemplateCard";
import { Button } from "@/ui/Button";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { useTheme } from "@/hooks/useTheme";
import { Spinner } from "@/components/Spinner";

const AllTemplatesPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { data: templates, isLoading, isError, refetch } = useTemplates();

  const handleBackClick = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <DashboardLayout
        onMyRatingsClick={handleBackClick}
        showTemplatesNav={true}
        showThemeToggle={true}
        showSearch={false}
        activeItem="Все шаблоны"
      >
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout
        onMyRatingsClick={handleBackClick}
        showTemplatesNav={true}
        showThemeToggle={true}
        showSearch={false}
        activeItem="Все шаблоны"
      >
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">
            Ошибка загрузки шаблонов. Пожалуйста, попробуйте снова.
          </p>
          <Button onClick={() => refetch()} variant="primary">
            Повторить
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      onMyRatingsClick={handleBackClick}
      showTemplatesNav={true}
      showThemeToggle={true}
      showSearch={false}
      activeItem="Все шаблоны"
    >
      <section className="relative min-h-screen bg-[url('/templates.webp')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(10,10,10,0.82)_0%,rgba(18,18,18,0.76)_45%,rgba(10,10,10,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(217,79,43,0.18),transparent_34%),radial-gradient(circle_at_86%_78%,rgba(47,107,95,0.18),transparent_36%)]" />

        <div className="relative overflow-hidden px-4 pt-8 pb-6 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleBackClick}
              className="group sticky top-4 z-10 mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-white/30 bg-black/40 px-5 py-2.5 text-[#f3efe6] transition-colors duration-200 hover:border-white/55 hover:bg-black/55 cursor-pointer sm:w-fit"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Назад</span>
            </button>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1
                  className={`font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${
                    theme === "light" ? "text-slate-900" : "text-[#f3efe6]"
                  } mb-2`}
                >
                  Все шаблоны
                </h1>
                <p className={`text-sm ${theme === "light" ? "text-slate-700" : "text-[#b8b1a3]"}`}>
                  Выберите шаблон для создания нового тир-листа
                </p>
              </div>
              <button
                onClick={() => navigate("/templates/new")}
                className="group flex w-full items-center justify-center gap-2 rounded-md border border-[#f3efe6] bg-[#f3efe6] px-4 py-2.5 text-[#121212] transition-colors duration-200 hover:border-[#d94f2b] hover:bg-[#d94f2b] hover:text-[#f3efe6] cursor-pointer sm:w-auto"
              >
                <Plus size={18} className="group-hover:translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium">Создать шаблон</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative px-4 pb-12 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2
                className={`font-display text-2xl font-semibold tracking-tight ${
                  theme === "light" ? "text-slate-900" : "text-[#f3efe6]"
                } mb-2`}
              >
                Доступные шаблоны
              </h2>
              <div className="h-0.5 w-20 bg-(--accent-main)"></div>
            </div>

            {templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:p-2 md:p-4 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    showEditDelete={template.authorId !== undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mb-6">
                  <FileText size={56} className="text-[#b8b1a3] mx-auto" />
                </div>
                <h3 className="text-xl font-medium text-[#f3efe6] mb-2">
                  Нет доступных шаблонов
                </h3>
                <p className="text-[#b8b1a3] mb-6">
                  В настоящее время нет доступных шаблонов.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
};
export default AllTemplatesPage;