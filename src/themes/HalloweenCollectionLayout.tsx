import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/500.css";
import "./themes/halloween.css";
import type { CollectionItem } from "@/types/collection";
import type { ThemeConfig } from "./types";
import { DefaultCollectionLayout } from "@/pages/CollectionPage/DefaultCollectionLayout";
import { ThemeDecor } from "./ThemeDecor";
import { ThemeProvider } from "./ThemeProvider";

interface HalloweenCollectionLayoutProps {
  collection: CollectionItem;
  theme: ThemeConfig;
}

export function HalloweenCollectionLayout({
  collection,
  theme,
}: HalloweenCollectionLayoutProps) {
  return (
    <ThemeProvider theme={theme}>
      <div className="halloween-collection-layout">
        {theme.decor && <ThemeDecor name={theme.decor} />}
        <DefaultCollectionLayout collection={collection} />
      </div>
    </ThemeProvider>
  );
}
