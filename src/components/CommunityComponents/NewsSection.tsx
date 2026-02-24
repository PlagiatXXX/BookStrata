import { NEWS_ITEMS } from '../../data/mockData';

export const NewsSection = () => {
  return (
    <section className="mb-12 reveal" data-reveal>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
            Новости и подборки
          </h2>
          <p className="text-(--ink-1) text-sm mt-1">
            Самое важное за последнее время
          </p>
        </div>
        <button className="text-(--ink-0) text-xs font-semibold uppercase tracking-[0.12em] border-b border-(--line-soft) hover:border-(--line-strong) cursor-pointer">
          Все новости
        </button>
      </div>

      <div className="community-rule mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {NEWS_ITEMS.map((item) => (
          <article
            key={item.id}
            className="brutal-card brutal-border p-6 hover-lift cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--ink-1) mb-3">
              <span className="brutal-label px-2 py-0.5">
                {item.tag}
              </span>
              <span>{item.readTime}</span>
            </div>
            <h3 className="community-heading text-xl font-bold leading-snug mb-2">
              {item.title}
            </h3>
            <p className="text-(--ink-1) text-sm mb-4">{item.excerpt}</p>
            <button className="text-(--ink-0) text-xs font-semibold uppercase tracking-[0.12em] border-b border-(--line-soft) hover:border-(--line-strong) cursor-pointer">
              Открыть
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
