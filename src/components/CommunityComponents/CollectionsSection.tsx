import { COLLECTIONS } from '../../data/mockData';

export const CollectionsSection = () => {
  return (
    <section className="mt-20 brutal-card brutal-border p-8 reveal" data-reveal>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-1)">
            curated
          </p>
          <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
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
        {COLLECTIONS.map((collection) => (
          <div
            key={collection.id}
            className="brutal-card brutal-border p-6 hover-lift cursor-pointer group"
          >
            <div className="flex gap-1 mb-4">
              {collection.coverImages.map((img, idx) => (
                <div key={`${img}-${idx}`} className="flex-1 h-20 bg-(--bg-0) border border-(--line-soft) rounded-sm overflow-hidden">
                  <img
                    alt={`Cover ${idx + 1}`}
                    className="w-full h-full object-cover"
                    src={img}
                  />
                </div>
              ))}
            </div>
            <h4 className="community-heading text-xl font-bold leading-tight group-hover:text-(--accent-main) transition-colors">
              {collection.title}
            </h4>
          </div>
        ))}
      </div>
    </section>
  );
};
