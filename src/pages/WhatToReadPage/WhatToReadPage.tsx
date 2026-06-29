import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { CollectionCard } from "@/components/CommunityComponents/CollectionCard";
import { getPublishedCollections } from "@/lib/collectionsApi";

interface MoodCard {
  emoji: string;
  title: string;
  description: string;
  slug: string;
  image?: string;
}

const MOODS: MoodCard[] = [
  { emoji: "😂", title: "Посмеяться", description: "Юмористические книги и комедийные романы", slug: "what-to-read-funny", image: "/funny_small.webp" },
  { emoji: "😱", title: "Испугаться", description: "Хорроры и мистика", slug: "horror-books", image: "/scary_small.webp" },
  { emoji: "🤔", title: "Задуматься", description: "Философская проза и интеллектуальные романы", slug: "best-books-ever" },
  { emoji: "💕", title: "Влюбиться", description: "Любовные романы и истории", slug: "top-romance" },
  { emoji: "🧙‍♂️", title: "Убежать от реала", description: "Фэнтези и магические миры", slug: "top-fantasy" },
  { emoji: "🔍", title: "Раскрыть тайну", description: "Детективы и триллеры", slug: "top-detective" },
];

export default function WhatToReadPage() {
  const { data: collections = [] } = useQuery({
    queryKey: ["published-collections"],
    queryFn: getPublishedCollections,
    staleTime: 60 * 1000,
    retry: 2,
  });

  // Только curated (тир-листы), literary — на странице сообщества
  const curatedCollections = collections.filter((c) => c.type === "curated");
  const popularCollections = curatedCollections.slice(0, 4);

  return (
    <>
      <SEOHead
        title="Что почитать — подборки книг по настроению | BookStrata"
        description="Подбери книгу под настроение: фэнтези, детективы, классика, романтика, ужасы. Интерактивные рейтинги книг в формате тир-листов."
        url="/what-to-read"
      />
      <DashboardLayout showSearch={false} activeItem="Новости">
        <div className="px-6 pt-6 pb-4">
          <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Что почитать" }]} />
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-12">
          {/* Hero */}
          <div className="mb-10">
            <h1 className="community-heading text-3xl font-black leading-tight sm:text-4xl md:text-5xl mb-4">
              Что почитать?
            </h1>
            <p className="text-lg text-(--ink-2) max-w-2xl">
              Найди книгу под настроение или посмотри популярные подборки читателей BookStrata.
            </p>
          </div>

          {/* Mood selector — 6 карточек */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {MOODS.map((mood) => (
              <Link
                key={mood.slug}
                to={`/collections/${mood.slug}`}
                className="brutal-card brutal-border p-5 text-center hover-lift transition-all duration-200 group"
              >
                <div className="mb-3 group-hover:scale-110 transition-transform flex items-center justify-center">
                  {mood.image ? (
                    <img src={mood.image} alt={mood.title} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <span className="text-3xl">{mood.emoji}</span>
                  )}
                </div>
                <h3 className="text-sm font-bold mb-1">{mood.title}</h3>
                <p className="text-xs text-(--ink-2) leading-relaxed">
                  {mood.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Популярные подборки */}
          {popularCollections.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-(--accent-main)" />
                <h2 className="text-xl font-bold">Популярные подборки</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[200px]">
                {popularCollections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            </div>
          )}

          {/* Final CTA */}
          <div className="brutal-card brutal-border p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles size={24} className="text-(--accent-main)" />
              <h2 className="text-2xl font-bold">Создай свой гид по книгам</h2>
            </div>
            <p className="text-(--ink-2) mb-6 max-w-lg mx-auto">
              Собери собственную подборку любимых книг в формате тир-листа и поделись с сообществом.
            </p>
            <Link
              to="/auth?mode=register"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100"
            >
              <BookOpen size={18} />
              Создать аккаунт
            </Link>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
