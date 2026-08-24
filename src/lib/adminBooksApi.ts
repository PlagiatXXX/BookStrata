// src/lib/adminBooksApi.ts
// API админки каталога книг (Фаза 7, seobook.md): листинг с фильтрами,
// правка полей + slug с историей, публикация, merge дублей, обогащение
// из Google Books, топ по просмотрам, модерация комментариев.
import { apiClient } from "./api-client";

export interface ContextChainItem {
  icon: string;
  title: string;
  text: string;
}

export interface AdminBookListItem {
  id: number;
  title: string;
  author: string | null;
  slug: string | null;
  status: "draft" | "published";
  genre: string | null;
  tags: string[];
  coverImageUrl: string;
  rating: number | null;
  likesCount: number;
  views: number;
  publishedAt: string | null;
  updatedAt: string;
  mergedIntoId: number | null;
  source: string | null;
  externalId: string | null;
  /** Владелец личной книги (draft из тир-листа) — единый каталог (19.08) */
  ownerUsername: string | null;
  /** Названия тир-листов, где книга размещена (≤5) */
  tierListNames: string[];
  _count: { comments: number; placements: number };
  isTrending: boolean;
}

export interface AdminBookDetail extends AdminBookListItem {
  authorId: number | null;
  description: string | null;
  publishedYear: number | null;
  isbn: string | null;
  contextChain: ContextChainItem[] | null;
  createdAt: string;
  authorRel: { name: string } | null;
  slugHistory: { id: number; oldSlug: string; createdAt: string }[];
}

export interface BookListParams {
  q?: string;
  status?: string;
  genre?: string;
  duplicatesOnly?: boolean;
  /** Происхождение книги: "tier-list" — есть вхождения в тир-листы пользователей */
  origin?: "tier-list" | "catalog";
  sort?: string;
  offset?: number;
  limit?: number;
}

export interface BookUpdateInput {
  title?: string;
  author?: string | null;
  description?: string | null;
  genre?: string | null;
  tags?: string[];
  coverImageUrl?: string;
  publishedYear?: number | null;
  slug?: string;
  contextChain?: ContextChainItem[] | null;
  isTrending?: boolean;
}

export interface AdminComment {
  id: number;
  content: string;
  likesCount: number;
  editedAt: string | null;
  createdAt: string;
  parentId: number | null;
  book: { id: number; title: string; slug: string | null };
  user: { id: number; username: string; avatarUrl: string | null };
}

export async function listAdminBooks(params: BookListParams = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.genre) query.set("genre", params.genre);
  if (params.duplicatesOnly) query.set("duplicatesOnly", "true");
  if (params.origin) query.set("origin", params.origin);
  if (params.sort) query.set("sort", params.sort);
  if (params.offset) query.set("offset", String(params.offset));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiClient.get<{ items: AdminBookListItem[]; total: number }>(
    qs ? `/admin/books?${qs}` : "/admin/books",
  );
}

export async function getAdminBook(id: number): Promise<AdminBookDetail | null> {
  return apiClient.get<AdminBookDetail>(`/admin/books/${id}`);
}

export async function updateAdminBook(id: number, patch: BookUpdateInput): Promise<AdminBookDetail> {
  return apiClient.patch<AdminBookDetail>(`/admin/books/${id}`, patch);
}

export async function publishAdminBook(id: number) {
  return apiClient.post(`/admin/books/${id}/publish`);
}

export async function unpublishAdminBook(id: number) {
  return apiClient.post(`/admin/books/${id}/unpublish`);
}

export async function enrichAdminBook(id: number): Promise<{ updated: string[] }> {
  return apiClient.post<{ updated: string[] }>(`/admin/books/${id}/enrich`);
}

// Загрузить обложку книги (файл → base64 → S3/CDN)
export async function uploadBookCover(
  file: File,
): Promise<{ coverImageUrl: string }> {
  const base64 = await fileToBase64(file);
  return apiClient.post<{ coverImageUrl: string }>(
    "/admin/books/upload-cover",
    { coverImageUrl: base64 },
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function mergeAdminBooks(dupId: number, targetId: number) {
  return apiClient.post(`/admin/books/${dupId}/merge`, { targetId });
}

export async function listAdminComments(params: {
  bookId?: number;
  q?: string;
  offset?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.bookId) query.set("bookId", String(params.bookId));
  if (params.q) query.set("q", params.q);
  if (params.offset) query.set("offset", String(params.offset));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiClient.get<{ items: AdminComment[]; total: number }>(
    qs ? `/admin/books/comments?${qs}` : "/admin/books/comments",
  );
}

export async function updateAdminComment(id: number, content: string) {
  return apiClient.patch(`/admin/books/comments/${id}`, { content });
}

export async function deleteAdminComment(id: number) {
  return apiClient.delete(`/admin/books/comments/${id}`);
}
