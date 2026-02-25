import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import TemplateLibrary from "@/components/TemplateLibrary/TemplateLibrary";

const TemplateLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleMyRatingsClick = () => {
    navigate("/");
  };

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      onSearch={(query) => setSearchQuery(query)}
      searchValue={searchQuery}
      showTemplatesNav={true}
      showSearch={true}
      activeItem="Шаблоны"
    >
      <section className="relative min-h-screen bg-[linear-gradient(165deg,#041926_0%,#071f2b_35%,#021320_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(0,195,255,0.14),transparent_36%),radial-gradient(circle_at_84%_80%,rgba(31,124,158,0.12),transparent_38%)]" />

        <div className="relative px-4 pb-8 pt-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <button
                onClick={handleMyRatingsClick}
                className="group flex items-center gap-2 rounded-xl border border-cyan-900/70 bg-[#062133]/75 px-4 py-2 text-slate-100 transition-colors hover:border-cyan-700/90 hover:bg-[#09283d]"
              >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium">На главную</span>
              </button>
            </div>

            <div className="mb-6">
              <h1 className="mb-2 font-display text-3xl font-bold tracking-tight text-[#f3efe6] lg:text-5xl">
                Мои шаблоны
              </h1>
              <p className="text-sm text-[#b8b1a3]">
                Управляйте своей коллекцией шаблонов и публичными тир-листами.
              </p>
            </div>

            <TemplateLibrary searchQuery={searchQuery} />
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default TemplateLibraryPage;
