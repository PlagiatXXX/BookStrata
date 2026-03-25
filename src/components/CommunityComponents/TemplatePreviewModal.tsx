import { useState } from 'react';
import { X, BookOpen, Layers, Tag } from 'lucide-react';
import type { TemplateItem } from '../../data/mockData';

interface TemplatePreviewModalProps {
  template: TemplateItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isApplying: boolean;
}

export const TemplatePreviewModal = ({
  template,
  isOpen,
  onClose,
  onConfirm,
  isApplying,
}: TemplatePreviewModalProps) => {
  const [activeTab, setActiveTab] = useState<'books' | 'tiers'>('books');

  if (!isOpen) return null;

  const defaultBooks = template.templateData.defaultBooks || [];
  const tiers = template.templateData.tiers || [];

  // Группируем книги по уровням
  const booksByTier = defaultBooks.reduce((acc, book) => {
    const tierId = book.defaultTierId;
    if (!acc[tierId]) {
      acc[tierId] = [];
    }
    acc[tierId].push(book);
    return acc;
  }, {} as Record<string, typeof defaultBooks>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="brutal-card brutal-border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-(--line-soft)">
          <div>
            <h2 className="community-heading text-2xl font-black mb-1">
              {template.templateData.title}
            </h2>
            {template.templateData.description && (
              <p className="text-(--ink-1) text-sm">
                {template.templateData.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-(--line-soft) rounded transition-colors"
            aria-label="Закрыть"
          >
            <X size={20} className="text-(--ink-1)" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-(--line-soft)">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'books'
                ? 'bg-(--line-soft) text-(--ink-0)'
                : 'text-(--ink-1) hover:text-(--ink-0)'
            }`}
          >
            <BookOpen size={16} />
            Книги ({defaultBooks.length})
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'tiers'
                ? 'bg-(--line-soft) text-(--ink-0)'
                : 'text-(--ink-1) hover:text-(--ink-0)'
            }`}
          >
            <Layers size={16} />
            Уровни ({tiers.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'books' && (
            <div className="space-y-6">
              {defaultBooks.length === 0 ? (
                <div className="text-center py-12 text-(--ink-1)">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>В этом шаблоне пока нет книг</p>
                  <p className="text-sm mt-2">Вы сможете добавить их после создания</p>
                </div>
              ) : (
                <>
                  {/* Список книг с группировкой по уровням */}
                  {tiers.map((tier) => {
                    const tierBooks = booksByTier[tier.id] || [];
                    if (tierBooks.length === 0) return null;

                    return (
                      <div key={tier.id} className="border border-(--line-soft) rounded overflow-hidden">
                        {/* Заголовок уровня */}
                        <div
                          className="px-4 py-2 font-bold text-white text-sm uppercase tracking-wider"
                          style={{ backgroundColor: tier.color }}
                        >
                          {tier.name} — {tierBooks.length} кн.
                        </div>

                        {/* Список книг */}
                        <div className="divide-y divide-(--line-soft)">
                          {tierBooks.map((book, idx) => (
                            <div
                              key={book.id || idx}
                              className="flex gap-4 p-4 hover:bg-(--line-soft)/30 transition-colors"
                            >
                              {/* Обложка */}
                              <div className="w-16 h-24 flex-shrink-0 overflow-hidden rounded shadow-md">
                                {book.coverImageUrl ? (
                                  <img
                                    src={book.coverImageUrl}
                                    alt={book.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-800" />
                                )}
                              </div>

                              {/* Информация */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-(--ink-0) truncate">
                                  {book.title}
                                </h4>
                                <p className="text-sm text-(--ink-1) mb-2">
                                  {book.author}
                                </p>
                                {book.description && (
                                  <p className="text-xs text-(--ink-2) line-clamp-2">
                                    {book.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="space-y-3">
              {tiers.map((tier, idx) => (
                <div
                  key={tier.id}
                  className="flex items-center gap-4 p-4 border border-(--line-soft) rounded"
                >
                  <div
                    className="w-16 h-12 flex items-center justify-center font-bold text-white text-sm rounded"
                    style={{ backgroundColor: tier.color }}
                  >
                    {tier.name}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-(--ink-1)">
                      Уровень {idx + 1} из {tiers.length}
                    </p>
                  </div>
                  <Tag size={20} className="text-(--ink-2)" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-(--line-soft) bg-(--bg-1)">
          <div className="text-sm text-(--ink-1)">
            <span className="font-semibold text-(--ink-0)">{defaultBooks.length}</span> книг будет добавлено автоматически
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="brutal-btn px-6 py-3 text-xs font-semibold uppercase tracking-widest"
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              disabled={isApplying}
              className={`brutal-cta px-8 py-3 text-xs font-semibold uppercase tracking-widest ${
                isApplying ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isApplying ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-(--bg-0) border-t-transparent rounded-full animate-spin" />
                  Создаю...
                </span>
              ) : (
                'Использовать шаблон'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
