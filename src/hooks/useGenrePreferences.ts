// src/hooks/useGenrePreferences.ts
// Жанровые предпочтения профиля (7-я ось Book Match): query + mutation.
// Данные: GET/PUT /api/users/me/genre-preferences; инвалидация book-match
// пересчитывает рекомендации после смены жанров.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuthContext";
import { apiGetGenrePreferences, apiSetGenrePreferences } from "@/lib/userApi";
import type { CategoryId } from "@/data/genre-taxonomy";

/** Канонический query key предпочтений. */
export const genrePreferencesKey = ["genre-preferences"] as const;

/** Лимит выбора жанров (дизайн 7-й оси Book Match). */
export const MAX_GENRE_PREFERENCES = 7;

export function useGenrePreferences() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: genrePreferencesKey,
    queryFn: apiGetGenrePreferences,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetGenrePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (genres: CategoryId[]) => apiSetGenrePreferences(genres),

    // Optimistic: чип переключается мгновенно, сервер подтверждает.
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: genrePreferencesKey });
      const prev = queryClient.getQueryData<CategoryId[]>(genrePreferencesKey);
      queryClient.setQueryData(genrePreferencesKey, next);
      return { prev };
    },
    onError: (_error, _variables, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(genrePreferencesKey, context.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: genrePreferencesKey });
      void queryClient.invalidateQueries({ queryKey: ["book-match"] });
    },
  });
}
