import { apiClient } from "./api-client";

export interface DnaAxesData {
  storyFocus: number;
  emotionalWeight: number;
  pace: number;
  darkness: number;
  scope: number;
  complexity: number;
}

export interface DnaBookItemData {
  title: string;
  author?: string;
  bookId?: number;
  coverImageUrl?: string;
}

export interface ReadingDnaInputData {
  axes: DnaAxesData;
  favoriteBooks: DnaBookItemData[];
  kryptoniteBook?: DnaBookItemData | null;
  likedGenres: string[];
  dislikedGenres: string[];
  favoriteAuthors: string[];
  customName?: string;
  theme?: "dark" | "craft";
  guestToken?: string;
}

export interface ReadingDnaResponseData {
  id: number;
  ticketNumber: string;
  customName?: string | null;
  archetype: string;
  archetypeName: string;
  archetypeDesc?: string | null;
  motto?: string | null;
  theme: string;
  axes: DnaAxesData;
  favoriteBooks: DnaBookItemData[];
  kryptoniteBook?: DnaBookItemData | null;
  likedGenres: string[];
  dislikedGenres: string[];
  favoriteAuthors: string[];
  shareUrl?: string | null;
  shortCode?: string | null;
  qrCodeUrl?: string | null;
  ticketImageUrl?: string | null;
  viewsCount: number;
  shareCount: number;
  duelsCount: number;
  createdAt: string;
}

export interface ReadingDnaDuelInputData {
  targetTicketNumber: string;
  challengerTicketNumber?: string;
  challengerName?: string;
  challengerDna?: ReadingDnaInputData;
}

export interface ReadingDnaDuelResultData {
  compatibility: number;
  verdict: string;
  targetTicketNumber: string;
  breakdown: {
    axesSimilarity: number;
    genreScore: number;
    bookScore: number;
    authorScore: number;
    sharedDislikeBonus: number;
    kryptoniteConflict: boolean;
    kryptonitePenalty: number;
  };
}

/**
 * Публичный расчет превью билета и архетипа без сохранения в базу данных.
 */
export async function previewReadingDna(
  input: ReadingDnaInputData
): Promise<{
  archetype: string;
  archetypeName: string;
  archetypeDesc: string;
  motto: string;
  specialSign: string;
  axes: DnaAxesData;
  favoriteBooks: DnaBookItemData[];
  kryptoniteBook?: DnaBookItemData | null;
  theme: string;
}> {
  return apiClient.post("/reading-dna/preview", input);
}

/**
 * Сохранение / обновление читательского ДНК (авторизованный пользователь или гость).
 */
export async function saveReadingDna(
  input: ReadingDnaInputData
): Promise<ReadingDnaResponseData> {
  return apiClient.post<ReadingDnaResponseData>("/reading-dna/save", input);
}

/**
 * Получение читательского билета по уникальному номеру (BS-XXXX-X) или shortCode.
 */
export async function getReadingTicket(
  ticketNumber: string
): Promise<ReadingDnaResponseData> {
  return apiClient.get<ReadingDnaResponseData>(`/reading-dna/ticket/${ticketNumber}`);
}

/**
 * Проведение литературной дуэли.
 */
export async function conductReadingDuel(
  input: ReadingDnaDuelInputData
): Promise<ReadingDnaDuelResultData> {
  return apiClient.post<ReadingDnaDuelResultData>("/reading-dna/duel", input);
}

/**
 * Поиск книжных близнецов (Twin Search).
 */
export async function getReadingTwins(
  ticketNumber: string,
  limit = 5
): Promise<{ twins: Array<ReadingDnaResponseData & { similarity: number }> }> {
  return apiClient.get(`/reading-dna/twins/${ticketNumber}`, { limit });
}
