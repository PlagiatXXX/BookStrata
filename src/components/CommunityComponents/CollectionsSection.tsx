import { memo } from "react";
import { Link } from "react-router-dom";
import { COLLECTIONS } from "../../data/mockData";
import { proxyImageUrl } from "@/utils/imageProxy";

export const CollectionsSection = memo(() => {
  return (
    <section className="mt-20 brutal-card brutal-border p-8 reveal" data-reveal>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h2 className="community-heading text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
            Литературные подборки
          </h2>
          <p className="text-(--ink-1) mt-1">Отобрано модераторами</p>
        </div>
        <button className="brutal-cta px-5 py-2 text-xs font-semibold uppercase tracking-widest cursor-not-allowed opacity-60">
          Подписаться
        </button>
      </div>

      <div className="community-rule mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLLECTIONS.filter((c) => c.isPublished).map((collection) => (
          <div
            key={collection.id}
            className="brutal-card brutal-border p-6 hover-lift"
          >
            {collection.bookCovers && collection.bookCovers.length > 0 ? (
              <div className="flex gap-1 mb-4">
                {collection.bookCovers.map((img: string, idx: number) => (
                  <div
                    key={`${img}-${idx}`}
                    className="flex-1 h-20 bg-(--bg-0) border border-(--line-soft) rounded-sm overflow-hidden"
                  >
                    <img
                      alt={`Cover ${idx + 1}`}
                      className="w-full h-full object-cover"
                      src={img}
                      onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
                    />
                  </div>
                ))}
              </div>
            ) : collection.coverImageUrl ? (
              <div className="mb-4 h-20 bg-(--bg-0) border border-(--line-soft) rounded-sm overflow-hidden">
                <img
                  alt={collection.title}
                  className="w-full h-full object-cover"
                  src={proxyImageUrl(collection.coverImageUrl)}
                  onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
                />
              </div>
            ) : null}
            <h4 className="community-heading text-xl font-bold leading-tight mb-3">
              {collection.title}
            </h4>
            <Link
              to={`/collections/${collection.id}`}
              className="text-(--ink-0) text-xs font-semibold uppercase tracking-[0.12em] border-b border-(--line-soft) hover:border-(--line-strong) cursor-pointer"
            >
              Открыть
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
});
