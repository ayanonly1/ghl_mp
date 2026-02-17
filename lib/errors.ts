/**
 * Consistent API error shape and helpers.
 */

export interface ApiErrorBody {
  error: string;
}

export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function mapSmitheryStatus(status: number): number {
  if (status >= 500) return 503;
  return status;
}

export function mapGhlStatus(status: number): number {
  if (status === 404) return 404;
  if (status === 401 || status === 403) return status;
  return 502;
}
