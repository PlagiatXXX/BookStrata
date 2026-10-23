import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import type { CollectionItem } from "@/types/collection";
import { groupCollections, type CollectionGroup } from "./groupCollections";
import { useCollectionsList } from "./hooks/useCollectionsList";

const SEO_TITLE = "Подборки книг — каталог рейтингов и что почитать";
const SEO_DESCRIPTION =
  "Все подборки книг BookStrata: топы ужасов, фэнтези, детективов, нон-фикшн и другие жанровые рейтинги. Что почитать — выбирай по жанру.";

const COLLECTIONS_FAQ = [
  {
    question: "Что такое подборки книг на BookStrata?",
    answer:
      "Это редакционные и пользовательские подборки книг по жанрам, темам и настроениям. В отличие от тир-листов, подборки составлены командой или читателями BookStrata.",
  },
  {
    question: "Как найти, что почитать?",
    answer:
      "Откройте нужный жанр или подборку — там собраны лучшие книги с рейтингами и отзывами читателей. Также можно воспользоваться страницей «Что почитать» для выбора по настроению.",
  },
  {
    question: "Можно ли создать свою подборку?",
    answer:
      "Да, зарегистрированные пользователи могут создавать тир-листы и делиться ими. Редакционные подборки создаёт команда BookStrata.",
  },
] as const;

const collectionsFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: COLLECTIONS_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

function pluralizeCollections(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "подборка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "подборки";
  return "подборок";
}

function CollectionCard({ collection }: { collection: CollectionItem }) {
  return (
    <Link
      to={`/collections/${collection.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/3 transition-colors hover:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <div className="aspect-16/10 overflow-hidden bg-black/30">
        {collection.coverImageUrl ? (
          <img
            src={collection.coverImageUrl}
            alt={`Обложка: ${collection.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-sm font-semibold leading-snug text-neutral-100">{collection.title}</h3>
        {collection.excerpt ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-400">{collection.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}

/** Плитка жанрового раздела: ведёт на топик /topics/:id — полный контент подборок там. */

/**
 * Колонки мозаики обложек по их числу — чтобы не оставалось пустых ячеек:
 * 1 обложка → во всю ширину плитки, 2 → пополам, 3 → по трети, 4 → сетка 2×2.
 */
const MOSAIC_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2",
};

function TopicTile({ group }: { group: CollectionGroup }) {
  const covers = group.items
    .map((c) => c.coverImageUrl)
    .filter(Boolean)
    .slice(0, 4);
  const colsClass = MOSAIC_COLS[covers.length] ?? "grid-cols-2";

  return (
    <Link
      to={`/topics/${group.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/3 transition-colors hover:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <div className={`grid aspect-video ${colsClass} gap-0.5 overflow-hidden bg-black/30`}>
        {covers.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-2 p-3">
        <h2 className="text-base font-bold text-neutral-100 transition-colors group-hover:text-amber-400">
          {group.label}
        </h2>
        <span className="shrink-0 text-xs text-neutral-500">
          {group.items.length} {pluralizeCollections(group.items.length)}
        </span>
      </div>
    </Link>
  );
}

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCollectionsList();
  const collections = data ?? [];
  const { groups, rest } = groupCollections(collections);

  // Паттерн других страниц: назад в историю, при первом визите — на главную
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="mx-auto w-full max-w-container-max px-4 py-8 sm:px-6 lg:px-8">
      <SEOHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        url="/collections"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Подборки книг", url: "/collections" },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(collectionsFaqJsonLd)}</script>
      </Helmet>

      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Подборки книг" }]} />

      {/* Назад */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Назад
      </button>

      <h1 className="mb-3 text-3xl font-black tracking-tight text-neutral-100 sm:text-4xl">
        Подборки книг
      </h1>
      <p className="mb-8 max-w-3xl text-sm leading-relaxed text-neutral-400 sm:text-base">
        Подборки составлены редакцией и читателями BookStrata — топы по жанрам, сезонные рейтинги и
        подборки под настроение. Открывайте жанровый раздел и находите, что почитать дальше.
      </p>

      {isLoading ? (
        <p className="text-neutral-400">Загружаем подборки…</p>
      ) : isError ? (
        <p className="text-red-400">Не удалось загрузить подборки. Попробуйте обновить страницу.</p>
      ) : collections.length === 0 ? (
        <p className="text-neutral-400">Подборок пока нет — загляните позже.</p>
      ) : (
        <>
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <TopicTile key={g.id} group={g} />
            ))}
          </div>
          {rest.length > 0 ? (
            <section>
              <h2 className="mb-4 text-xl font-bold text-neutral-100">Все подборки</h2>
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
                {rest.map((c) => (
                  <CollectionCard key={c.id} collection={c} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
