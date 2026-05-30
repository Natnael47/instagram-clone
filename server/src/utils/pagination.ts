/**
 * Pagination options interface
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
  populate?: string | string[] | Record<string, unknown>;
  select?: string | Record<string, number>;
}

/**
 * Pagination result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parses page and limit from query parameters
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10, max: 100)
 * @returns Parsed pagination parameters
 */
export const parsePaginationParams = (
  page?: string | number,
  limit?: string | number,
): { page: number; limit: number; skip: number } => {
  const parsedPage = Math.max(1, parseInt(String(page)) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit)) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  };
};

/**
 * Creates pagination metadata
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export const createPaginationMetadata = (
  page: number,
  limit: number,
  total: number,
): PaginatedResult<unknown>["pagination"] => {
  const pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};

/**
 * Formats query result with pagination metadata
 * @param data - Query result data
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Formatted paginated result
 */
export const formatPaginatedResult = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> => {
  return {
    data,
    pagination: createPaginationMetadata(page, limit, total),
  };
};

/**
 * Generates pagination links for API responses
 * @param baseUrl - Base URL of the endpoint
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Object with next, prev, first, last URLs
 */
export const generatePaginationLinks = (
  baseUrl: string,
  page: number,
  limit: number,
  total: number,
): {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
} => {
  const pages = Math.ceil(total / limit);
  const url = new URL(baseUrl);

  const buildUrl = (pageNum: number): string => {
    url.searchParams.set("page", pageNum.toString());
    url.searchParams.set("limit", limit.toString());
    return url.toString();
  };

  return {
    first: buildUrl(1),
    last: buildUrl(pages),
    prev: page > 1 ? buildUrl(page - 1) : null,
    next: page < pages ? buildUrl(page + 1) : null,
  };
};

/**
 * Applies pagination to a Mongoose query
 * @param query - Mongoose query object
 * @param page - Page number
 * @param limit - Items per page
 * @returns Mongoose query with pagination applied
 */
export const applyPagination = <T>(
  query: T,
  page: number,
  limit: number,
): T => {
  const { skip } = parsePaginationParams(page, limit);
  // @ts-expect-error - skip and limit are Mongoose query methods
  return query.skip(skip).limit(limit);
};
