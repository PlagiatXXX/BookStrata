// backend/src/modules/books/books.service.ts

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export interface BookSearchResult {
  openLibraryKey: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  publishYear?: number;
  numberOfPages?: number;
  subjects?: string[];
}

/**
 * Поиск книг в Google Books API
 */
export async function searchBooks(query: string, startIndex = 0): Promise<BookSearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  if (!GOOGLE_BOOKS_API_KEY) {
    throw new Error('Google Books API key not configured');
  }

  try {
    const url = new URL(GOOGLE_BOOKS_API_URL);
    url.searchParams.append('q', `intitle:${query}`);
    url.searchParams.append('key', GOOGLE_BOOKS_API_KEY);
    url.searchParams.append('maxResults', '20');
    url.searchParams.append('startIndex', startIndex.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { items?: GoogleBookResponse[]; totalItems?: number };

    const books: BookSearchResult[] = (data.items || [])
      .map(book => {
        const result: BookSearchResult = {
          openLibraryKey: book.id,
          title: book.volumeInfo.title,
          author: book.volumeInfo.authors?.[0] || 'Неизвестен',
          coverUrl: book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          coverUrlLarge: book.volumeInfo.imageLinks?.large?.replace('http:', 'https:') || 
                         book.volumeInfo.imageLinks?.medium?.replace('http:', 'https:') || 
                         book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        };
        
        if (book.volumeInfo.publishedDate) {
          result.publishYear = parseInt(book.volumeInfo.publishedDate.substring(0, 4));
        }
        if (book.volumeInfo.pageCount) {
          result.numberOfPages = book.volumeInfo.pageCount;
        }
        if (book.volumeInfo.categories) {
          result.subjects = book.volumeInfo.categories;
        }
        
        return result;
      })
      // Фильтруем только книги с обложками
      .filter(book => book.coverUrl || book.coverUrlLarge);

    return books;
  } catch (error) {
    console.error('Error searching Google Books:', error);
    throw error;
  }
}

export interface GoogleBookResponse {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      large?: string;
      medium?: string;
      small?: string;
    };
  };
}
