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
  retestCount?: number;
  retestsLeft?: number;
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

export interface DnaAxisRange {
  min: number;
  max: number;
}

export interface DnaArchetypeCatalogItem {
  id: string;
  number: number;
  caste: {
    id: "mind" | "abyss" | "action" | "light";
    name: string;
    sealColor: string;
    badgeClass: string;
  };
  rarity: number;
  names: {
    dark: string;
    craft: string;
  };
  description: string;
  quote: string;
  specialSign: string;
  axisRanges: Record<
    "storyFocus" | "emotionalWeight" | "pace" | "darkness" | "scope" | "complexity",
    DnaAxisRange
  >;
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

export interface ReadingDnaTwinData extends ReadingDnaResponseData {
  similarity: number;
  user?: {
    id: number;
    username: string;
    avatarUrl: string | null;
  } | null;
  topTierList?: {
    id: string;
    slug: string | null;
    title: string;
  } | null;
  publicTierListsCount?: number;
}

/**
 * Поиск книжных близнецов (Twin Search).
 */
export async function getReadingTwins(
  ticketNumber: string,
  limit = 5
): Promise<{ twins: ReadingDnaTwinData[] }> {
  return apiClient.get(`/reading-dna/twins/${ticketNumber}`, { limit });
}

/**
 * Получение полного каталога 16 читательских архетипов (единый источник с бэкенда).
 */
export async function getReadingArchetypes(): Promise<DnaArchetypeCatalogItem[]> {
  const res = await apiClient.get<{ archetypes: DnaArchetypeCatalogItem[] }>(
    "/reading-dna/archetypes"
  );
  return res.archetypes;
}

/**
 * Получение сохраненного ДНК текущего авторизованного пользователя.
 */
export async function getMyReadingDna(): Promise<ReadingDnaResponseData | null> {
  const res = await apiClient.get<{ dna: ReadingDnaResponseData | null }>("/reading-dna/me");
  return res.dna;
}

/**
 * Инкремент счётчика шеринга читательского билета.
 */
export async function shareReadingTicket(ticketNumber: string): Promise<number> {
  const res = await apiClient.post<{ shareCount: number }>("/reading-dna/share", {
    ticketNumber,
  });
  return res.shareCount;
}

/**
 * Привязка гостевого билета Reading DNA к аккаунту после входа/регистрации.
 */
export async function claimReadingDna(
  guestToken: string,
): Promise<{ claimed: boolean; dna: ReadingDnaResponseData }> {
  return apiClient.post<{ claimed: boolean; dna: ReadingDnaResponseData }>(
    "/reading-dna/claim",
    { guestToken },
  );
}

export interface ReadingDnaDuelEntryData {
  id: number;
  direction?: "incoming" | "outgoing";
  opponentName: string;
  opponentTicketNumber: string | null;
  opponentArchetypeName: string | null;
  compatibility: number;
  verdict: string | null;
  kryptoniteConflict: boolean;
  createdAt: string;
}

export interface ReadingDnaDuelsSummaryData {
  totalDuels: number;
  bestMatch: ReadingDnaDuelEntryData | null;
  mainAntagonist: ReadingDnaDuelEntryData | null;
  recentDuels: ReadingDnaDuelEntryData[];
}

/**
 * Журнал входящих дуэлей билета («Кто сравнил вкус со мной»).
 */
export async function getTicketDuels(
  ticketNumber: string,
  limit = 10
): Promise<ReadingDnaDuelsSummaryData> {
  return apiClient.get<ReadingDnaDuelsSummaryData>(
    `/reading-dna/duels/${ticketNumber}`,
    { limit }
  );
}

export interface ReadingDnaArchetypeStatsData {
  totalTickets: number;
  distribution: Record<string, { count: number; percent: number }>;
}

/**
 * Реальное распределение архетипов по базе данных.
 */
export async function getReadingArchetypeStats(): Promise<ReadingDnaArchetypeStatsData> {
  return apiClient.get<ReadingDnaArchetypeStatsData>("/reading-dna/stats");
}

export interface CelebrityDnaProfileData {
  id: number;
  slug: string;
  name: string;
  photoUrl: string;
  category: string;
  focalX: number;
  focalY: number;
  archetype: string;
  archetypeName: string;
  motto: string;
  axes: DnaAxesData;
  favoriteBooks: DnaBookItemData[];
  kryptoniteBook: DnaBookItemData | null;
  likedGenres: string[];
  favoriteAuthors: string[];
  booksCount: number;
}

export interface CelebrityDuelResultData {
  compatibility: number;
  verdict: string;
  breakdown: ReadingDnaDuelResultData["breakdown"];
  celebrity: CelebrityDnaProfileData;
}

/**
 * Список реальных знаменитостей BookStrata с вычисленным ДНК.
 */
export async function getReadingCelebrities(): Promise<CelebrityDnaProfileData[]> {
  const res = await apiClient.get<{ celebrities: CelebrityDnaProfileData[] }>(
    "/reading-dna/celebrities"
  );
  return res.celebrities;
}

/**
 * Дуэль вкусов со знаменитостью из базы BookStrata.
 */
export async function conductCelebrityDuel(
  slug: string,
  payload: { challengerTicketNumber?: string; challengerDna?: ReadingDnaInputData }
): Promise<CelebrityDuelResultData> {
  return apiClient.post<CelebrityDuelResultData>(
    `/reading-dna/duel/celebrity/${encodeURIComponent(slug)}`,
    payload
  );
}
