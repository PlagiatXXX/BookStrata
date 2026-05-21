export const ErrorCodes = {
  // 4xx Client Errors
  VALIDATION_ERROR: "validation_error",
  INVALID_INPUT: "invalid_input",
  MISSING_REQUIRED: "missing_required_field",
  INVALID_FORMAT: "invalid_format",
  INVALID_ID: "invalid_id",

  // 401
  UNAUTHORIZED: "unauthorized",
  TOKEN_EXPIRED: "token_expired",
  TOKEN_INVALID: "token_invalid",
  REFRESH_TOKEN_EXPIRED: "refresh_token_expired",
  AUTHENTICATION_REQUIRED: "authentication_required",

  // 403
  FORBIDDEN: "forbidden",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",
  ACCESS_DENIED: "access_denied",

  // 404
  NOT_FOUND: "not_found",
  USER_NOT_FOUND: "user_not_found",
  RESOURCE_NOT_FOUND: "resource_not_found",

  // 409
  CONFLICT: "conflict",
  DUPLICATE_ENTRY: "duplicate_entry",
  EMAIL_TAKEN: "email_taken",
  USERNAME_TAKEN: "username_taken",

  // 422
  UNPROCESSABLE_ENTITY: "unprocessable_entity",
  SEMANTIC_ERROR: "semantic_error",

  // 429
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  QUOTA_EXCEEDED: "quota_exceeded",

  // 500 Server Errors
  INTERNAL_ERROR: "internal_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
  EXTERNAL_SERVICE_ERROR: "external_service_error",
  DATABASE_ERROR: "database_error",
  UPLOAD_FAILED: "upload_failed",

  // Custom for BookStrata
  LIMIT_EXCEEDED: "limit_exceeded",
  PRO_REQUIRED: "pro_required",
  BOOK_NOT_FOUND: "book_not_found",
  TIER_LIST_NOT_FOUND: "tier_list_not_found",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export function createApiError(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiError {
  return {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

// ========== SUCCESS RESPONSE ==========

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemCount: number;
  itemsPerPage: number;
}

export interface PaginationLinks {
  self: string;
  next?: string;
  prev?: string;
  last?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return { data };
}

export function createPaginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
  links: PaginationLinks,
): ApiPaginatedResponse<T> {
  return { data, meta, links };
}


