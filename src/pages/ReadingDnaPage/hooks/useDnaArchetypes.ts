import { useQuery } from "@tanstack/react-query";
import {
  getReadingArchetypes,
  type DnaArchetypeCatalogItem,
} from "@/lib/readingDnaApi";

export function useDnaArchetypes(): {
  archetypes: DnaArchetypeCatalogItem[];
  isLoading: boolean;
  error: unknown;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ["readingDna", "archetypes"],
    queryFn: getReadingArchetypes,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    archetypes: data ?? [],
    isLoading,
    error,
  };
}
