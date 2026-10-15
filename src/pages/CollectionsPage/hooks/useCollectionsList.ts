import { useQuery } from "@tanstack/react-query";
import { getCollections } from "@/lib/collectionsApi";

export function useCollectionsList() {
  return useQuery({ queryKey: ["collections", "list"], queryFn: getCollections });
}
