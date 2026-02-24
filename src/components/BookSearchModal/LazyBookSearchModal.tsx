import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Ленивый импорт модального окна
const BookSearchModal = lazy(() => 
  import('./BookSearchModal').then(module => ({ default: module.BookSearchModal }))
);

// Компонент загрузки
function BookSearchModalLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div className="relative bg-[#1a1a2e] rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </div>
  );
}

// Обертка с Suspense
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyBookSearchModal = (props: any) => (
  <Suspense fallback={<BookSearchModalLoader />}>
    <BookSearchModal {...props} />
  </Suspense>
);

// Также экспортируем оригинальный компонент
export { BookSearchModal } from './BookSearchModal';
