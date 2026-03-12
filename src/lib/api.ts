/**
 * @deprecated Импортуйте напрямую из специализированных модулей:
 * - Tier lists: @/lib/tierListApi
 * - Book search: @/lib/bookSearchApi
 * - User: @/lib/userApi
 * - Likes: @/lib/likesApi
 * - Auth: @/lib/authApi
 *
 * Этот файл оставлен только для обратной совместимости.
 */

// ========== РЕ-ЭКСПОРТЫ: tierListApi ==========
export {
  createTierList,
  getUserTierLists,
  fetchTierList,
  deleteTierList,
  getPublicTierLists,
  saveTierListPlacements,
  saveTierListTiers,
  addBooksToTierList,
  removeBookFromTierList,
  updateTierListTitle,
  toggleTierListPublic,
  uploadBookCover,
  saveTierListOptimized,
  transformApiToState,
  transformStateToApi,
} from './tierListApi';

export type {
  TierListShort,
  PaginationMeta,
  PaginatedTierListsResponse,
  SaveTierListPayload,
} from './tierListApi';

// ========== РЕ-ЭКСПОРТЫ: bookSearchApi ==========
export {
  searchGoogleBooks,
  addBookFromGoogleBooks,
  searchOpenLibraryBooks,
  addBookFromOpenLibrary,
} from './bookSearchApi';

export type {
  OpenLibraryBook,
} from './bookSearchApi';

// ========== РЕ-ЭКСПОРТЫ: userApi ==========
export {
  apiGetMe,
  apiGetUserById,
  apiGetUserStats,
  apiUpdateAvatar,
  apiDeleteAvatar,
  apiUploadAvatar,
} from './userApi';

export type {
  User,
  UserStats,
} from './userApi';

// ========== РЕ-ЭКСПОРТЫ: likesApi ==========
export {
  apiGetTierListLikes,
  apiLikeTierList,
  apiUnlikeTierList,
  apiGetLikedTierListIds,
  apiGetTemplateLikes,
  apiLikeTemplate,
  apiUnlikeTemplate,
} from './likesApi';

export type {
  LikesResponse,
} from './likesApi';

// ========== РЕ-ЭКСПОРТЫ: authApi ==========
export {
  apiRegister,
  apiLogin,
  apiValidateToken,
  setAuthToken,
  getAuthToken,
  removeAuthToken,
  getAuthHeader,
  handleUnauthorized,
  handleResponse,
} from './authApi';

export type {
  User as AuthUser,
} from './authApi';

// ========== РЕ-ЭКСПОРТЫ: api-client ==========
export {
  apiClient,
  api,
  buildUrl,
} from './api-client';

// ========== РЕ-ЭКСПОРТЫ: config ==========
export {
  API_BASE_URL,
} from './config';
