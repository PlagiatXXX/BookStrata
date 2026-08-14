import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBookRatings, getUserBookRating, rateBook } from "@/lib/ratingsApi";

/** Средние оценки книги (count — число пользовательских голосов) */
export function useBookRatings(bookId: number | null) {
  return useQuery({
    queryKey: ["book-ratings", bookId],
    queryFn: () => getBookRatings(bookId!),
    enabled: bookId !== null,
  });
}

/** Моя оценка книги (только для авторизованных) */
export function useMyBookRating(bookId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["my-book-rating", bookId],
    queryFn: () => getUserBookRating(bookId!),
    enabled: enabled && bookId !== null,
  });
}

/** Поставить/изменить свою оценку (upsert на бэке: одна оценка на пользователя) */
export function useRateBook(bookId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: number) => rateBook(bookId!, { overall: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-ratings", bookId] });
      queryClient.invalidateQueries({ queryKey: ["my-book-rating", bookId] });
    },
  });
}
