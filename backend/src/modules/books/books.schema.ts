// backend/src/modules/books/books.schema.ts
export const searchBooksSchema = {
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: { type: 'string', minLength: 2 },
      startIndex: { type: 'number', minimum: 0, default: 0 },
    },
  },
};

export const addBookSchema = {
  body: {
    type: 'object',
    required: ['tierListId', 'book'],
    properties: {
      tierListId: { type: 'number' },
      book: {
        type: 'object',
        required: ['openLibraryKey', 'title', 'author', 'coverUrl'],
        properties: {
          openLibraryKey: { type: 'string' },
          title: { type: 'string' },
          author: { type: 'string' },
          coverUrl: { type: 'string', format: 'uri' },
        },
      },
    },
  },
};
