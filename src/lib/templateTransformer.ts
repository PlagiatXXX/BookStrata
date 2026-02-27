/* eslint-disable @typescript-eslint/no-explicit-any */
import type { 
  TierTemplate, 
  BookTemplate 
} from '../types/templates';
import type { 
  ApiTierTemplate, 
  ApiBook 
} from '../types/api';

/**
 * Преобразует API-шаблон в тип Template
 */
export function transformApiTemplateToState(apiTemplate: any) {
  const previewImageUrl =
    apiTemplate.previewImageUrl ||
    apiTemplate.preview_image_url ||
    apiTemplate.coverImageUrl ||
    apiTemplate.defaultBooks?.[0]?.coverImageUrl ||
    apiTemplate.defaultBooks?.[0]?.cover_image_url;

  return {
    id: String(apiTemplate.id),
    title: apiTemplate.title,
    description: apiTemplate.description,
    previewImageUrl,
    category: apiTemplate.category || undefined,
    isArchived: Boolean(apiTemplate.isArchived),
    isFavorite: Boolean(apiTemplate.isFavorite),
    tiers: apiTemplate.tiers.map(transformApiTierTemplateToState),
    defaultBooks: apiTemplate.defaultBooks?.map(transformApiBookToState),
    isPublic: apiTemplate.isPublic,
    authorId: apiTemplate.authorId,
    createdAt: apiTemplate.createdAt,
    updatedAt: apiTemplate.updatedAt,
  };
}

/**
 * Преобразует тип Template в API-шаблон
 */
export function transformStateTemplateToApi(stateTemplate: any) {
  return {
    id: Number(stateTemplate.id),
    title: stateTemplate.title,
    description: stateTemplate.description,
    tiers: stateTemplate.tiers.map(transformStateTierTemplateToApi),
    defaultBooks: stateTemplate.defaultBooks?.filter((book: BookTemplate) => book.id && !book.id.startsWith?.('book-')).map(transformStateBookToApi),
    isPublic: stateTemplate.isPublic,
    authorId: stateTemplate.authorId,
    createdAt: stateTemplate.createdAt,
    updatedAt: stateTemplate.updatedAt,
  };
}

/**
 * Преобразует API-тир в тип TierTemplate
 */
function transformApiTierTemplateToState(apiTier: any): TierTemplate {
  return {
    id: String(apiTier.id),
    name: apiTier.name,
    color: apiTier.color,
    order: apiTier.order,
  };
}

/**
 * Преобразует тип TierTemplate в API-тир
 */
function transformStateTierTemplateToApi(stateTier: TierTemplate): ApiTierTemplate {
  return {
    id: stateTier.id, // Оставляем строкой, т.к. Zod схема ожидает string
    name: stateTier.name,
    color: stateTier.color,
    order: stateTier.order,
  };
}

/**
 * Преобразует API-книгу в тип BookTemplate
 */
function transformApiBookToState(apiBook: any): BookTemplate {
  return {
    id: String(apiBook.id),
    title: apiBook.title,
    author: apiBook.author || undefined,
    cover_image_url: apiBook.coverImageUrl,
    description: apiBook.description || undefined,
  };
}

/**
 * Преобразует тип BookTemplate в API-книгу
 */
function transformStateBookToApi(stateBook: BookTemplate): ApiBook {
  // Если id - строка в формате "book-xxx", значит это новая книга, у которой еще нет ID в базе
  // В таком случае устанавливаем id в 0 или вообще исключаем из запроса
  const numericId = stateBook.id && !stateBook.id.startsWith?.('book-') ? Number(stateBook.id) : 0;
  
  return {
    id: numericId,
    title: stateBook.title,
    author: stateBook.author || null,
    coverImageUrl: stateBook.cover_image_url || '',
    description: stateBook.description || null,
    thoughts: null,
    createdAt: new Date().toISOString(),
  };
}
