import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCatalogBooks, type CatalogBook } from "@/lib/bookApi";

interface UseCatalogSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  results: CatalogBook[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const DEBOUNCE_MS = 300;

export function useCatalogSearch(): UseCatalogSearchReturn {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce ввода
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["catalog-search", debouncedQuery],
    queryFn: () => searchCatalogBooks(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 60_000,
  });

  const handleSetQuery = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(value.trim().length >= 2);
    setActiveIndex(-1);
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
  };
}
