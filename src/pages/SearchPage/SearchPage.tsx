import { useState, useEffect, useRef, type FormEvent } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Star, User, BookOpen, Compass, ArrowRight } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { searchCatalogBooks, type CatalogBook } from "@/lib/bookApi";
import { searchAuthors, type AuthorResult } from "@/lib/authorsApi";
import { RetryableImage } from "@/ui/RetryableImage";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder/BookCoverPlaceholder";
import { pluralize } from "@/lib/plural";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlQuery = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизация локального стейта при смене URL
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const trimmedQuery = urlQuery.trim();
  const isSearchActive = trimmedQuery.length >= 2;

  // Поиск книг
  const { data: books = [], isLoading: isLoadingBooks } = useQuery<CatalogBook[]>({
    queryKey: ["catalog-search", trimmedQuery],
    queryFn: () => searchCatalogBooks(trimmedQuery),
    enabled: isSearchActive,
    staleTime: 60_000,
  });

  // Поиск авторов
  const { data: authors = [], isLoading: isLoadingAuthors } = useQuery<AuthorResult[]>({
    queryKey: ["author-search", trimmedQuery],
    queryFn: () => searchAuthors(trimmedQuery),
    enabled: isSearchActive,
    staleTime: 60_000,
  });

  const isLoading = isSearchActive && (isLoadingBooks || isLoadingAuthors);
  const hasResults = books.length > 0 || authors.length > 0;
  const isNotFound = isSearchActive && !isLoading && !hasResults;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = inputValue.trim();
    if (next) {
      setSearchParams({ q: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  const pageTitle = trimmedQuery
    ? `Поиск: ${trimmedQuery} | BookStrata`
    : "Поиск по книгам и авторам | BookStrata";

  return (
    <DashboardLayout showSearch={false} bgVariant="dark">
      <SEOHead
        title={pageTitle}
        description="Поиск книг, авторов и книжных рейтингов по каталогу BookStrata."
        url="/search"
        noindex
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Хлебные крошки */}
        <nav aria-label="Хлебные крошки" className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <Link to="/" className="transition-colors hover:text-white">
            Главная
          </Link>
          <span>/</span>
          <span className="text-slate-200">Поиск</span>
        </nav>

        {/* Заголовок и форма поиска */}
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Поиск по каталогу
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-400">
            Находите любимые книги, авторов и читательские тир-листы
          </p>

          <form onSubmit={handleSubmit} className="relative mx-auto mt-6 max-w-2xl">
            <div className="relative flex items-center">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Поиск по названию книги или имени автора..."
                aria-label="Поиск по названию или автору"
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-800/90 py-4 pl-12 pr-12 text-base text-white placeholder-slate-400 shadow-xl backdrop-blur-md transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Очистить поиск"
                  className="absolute right-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Начальное состояние: подсказка */}
        {!isSearchActive && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center backdrop-blur-sm">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-cyan-400" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-white">
              Введите название книги или автора для поиска
            </h2>
            <p className="mb-6 text-sm text-slate-400">
              Поиск ищет совпадения среди тысяч книг, авторов и подборок читателей.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/rankings"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <Star size={16} className="text-amber-400" />
                Рейтинги книг
              </Link>
              <Link
                to="/collections"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <Compass size={16} className="text-cyan-400" />
                Подборки
              </Link>
              <Link
                to="/authors"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <User size={16} className="text-violet-400" />
                Все авторы
              </Link>
            </div>
          </div>
        )}

        {/* Состояние загрузки */}
        {isLoading && (
          <div className="space-y-6">
            <div className="h-6 w-36 animate-pulse rounded bg-slate-800" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-[2/3] w-full rounded-xl bg-slate-800" />
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Результаты поиска: авторы */}
        {!isLoading && authors.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-white">Авторы</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {authors.map((author) => {
                const authorUrl = author.slug ? `/authors/${author.slug}` : `/authors`;
                return (
                  <Link
                    key={author.id}
                    to={authorUrl}
                    className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-cyan-500/50 hover:bg-slate-800/80"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-slate-300">
                      {author.heroImageUrl ? (
                        <img
                          src={author.heroImageUrl}
                          alt={author.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white transition-colors group-hover:text-cyan-400">
                        {author.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {author.bookCount}{" "}
                        {pluralize(author.bookCount, ["книга", "книги", "книг"])}
                      </p>
                    </div>
                    <ArrowRight
                      size={18}
                      className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Результаты поиска: книги */}
        {!isLoading && books.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-white">
              Книги{" "}
              <span className="text-sm font-normal text-slate-400">
                ({books.length})
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
              {books.map((book) => (
                <Link
                  key={book.id}
                  to={`/books/${book.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 transition-all hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-800">
                    {book.coverImageUrl ? (
                      <RetryableImage
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <BookCoverPlaceholder />
                    )}
                    {typeof book.rating === "number" && book.rating > 0 && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-slate-950/80 px-2 py-0.5 text-xs font-semibold text-amber-400 backdrop-blur-sm">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span>{book.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-cyan-400">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {book.author}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ничего не найдено */}
        {isNotFound && (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <Search size={28} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">Ничего не нашлось</h2>
            <p className="mb-6 text-sm text-slate-400">
              По запросу «<span className="text-slate-200">{trimmedQuery}</span>» не
              найдено книг или авторов. Проверьте правильность написания или попробуйте другой запрос.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Очистить поиск
              </button>
              <button
                type="button"
                onClick={() => navigate("/rankings")}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
              >
                Перейти в рейтинг
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
