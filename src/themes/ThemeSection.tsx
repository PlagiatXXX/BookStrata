import type { SectionType } from "./types";
import type { CollectionItem } from "@/types/collection";
import type { Tier, Book } from "@/types";
import type { ShelfStatus } from "@/lib/shelfApi";
import { StaticTierView } from "@/components/StaticTierView";
import { ThemeHeroSplit } from "./sections/ThemeHeroSplit";
import { ThemeFilterChips } from "./sections/ThemeFilterChips";
import { ThemeContentGrid } from "./sections/ThemeContentGrid";
import { ThemeProse } from "./sections/ThemeProse";
import { ThemeDescription } from "./sections/ThemeDescription";
import { ThemeSidebar } from "./sections/ThemeSidebar";

interface ThemeSectionProps {
  type: SectionType;
  collection: CollectionItem;
  filterGenre?: string;
  onFilterGenreChange?: (genre: string) => void;
  onViewBook?: (book: Book) => void;
  statuses?: Record<string, ShelfStatus>;
  collectionSlug?: string;
  currentUserId?: number | null;
}

export function ThemeSection({
  type,
  collection,
  filterGenre,
  onFilterGenreChange,
  onViewBook,
  statuses,
  collectionSlug,
  currentUserId,
}: ThemeSectionProps) {
  const tiers = (collection.tiers ?? {}) as Record<string, Tier>;
  const tierOrder = collection.tierOrder ?? Object.keys(tiers);
  const books = (collection.books ?? {}) as Record<string, Book>;

  switch (type) {
    case "hero-split":
      return (
        <ThemeHeroSplit
          title={collection.title}
          author="Букстраж"
          bookCount={Object.keys(books).length}
          coverImageUrl={collection.coverImageUrl}
        />
      );

    case "filter-chips": {
      const genreSet = new Set<string>();
      Object.values(books).forEach((book) => {
        if (book.genre) genreSet.add(book.genre);
      });
      const genreNames = Array.from(genreSet).sort();
      return (
        <ThemeFilterChips
          genres={genreNames}
          activeGenre={filterGenre ?? "all"}
          onGenreChange={onFilterGenreChange ?? (() => {})}
        />
      );
    }

    case "content-grid":
      if (collection.type === "literary" && collection.content) {
        return (
          <ThemeContentGrid>
            <ThemeProse content={collection.content} />
          </ThemeContentGrid>
        );
      }
      if (collection.tiers && collection.tierOrder && collection.books) {
        return (
          <ThemeContentGrid>
            <StaticTierView
              tiers={tiers}
              tierOrder={tierOrder}
              books={books}
              onViewBook={onViewBook}
              filterGenre={filterGenre}
              statuses={statuses}
              unrankedBookIds={collection.unrankedBookIds}
              linkToBook
            />
          </ThemeContentGrid>
        );
      }
      return null;

    case "category-blocks":
      if (collection.tiers && collection.tierOrder && collection.books) {
        return (
          <StaticTierView
            tiers={tiers}
            tierOrder={tierOrder}
            books={books}
            onViewBook={onViewBook}
            filterGenre={filterGenre}
            statuses={statuses}
            unrankedBookIds={collection.unrankedBookIds}
            linkToBook
          />
        );
      }
      return null;

    case "tier-view":
      if (collection.type === "literary" && collection.content) {
        return <ThemeProse content={collection.content} />;
      }
      if (collection.tiers && collection.tierOrder && collection.books) {
        return (
          <StaticTierView
            tiers={tiers}
            tierOrder={tierOrder}
            books={books}
            onViewBook={onViewBook}
            filterGenre={filterGenre}
            statuses={statuses}
            unrankedBookIds={collection.unrankedBookIds}
            linkToBook
          />
        );
      }
      return null;

    case "description":
      return (
        <ThemeDescription
          excerpt={collection.excerpt}
          editorialNote={collection.editorialNote}
        />
      );

    case "prose":
      if (collection.content) {
        return <ThemeProse content={collection.content} />;
      }
      return null;

    case "hero-full":
      return (
        <ThemeHeroSplit
          title={collection.title}
          author="Букстраж"
          bookCount={Object.keys(books).length}
          coverImageUrl={collection.coverImageUrl}
        />
      );

    case "sidebar":
      return (
        <ThemeSidebar
          collectionSlug={collectionSlug}
          currentUserId={currentUserId}
        />
      );

    default:
      return null;
  }
}
