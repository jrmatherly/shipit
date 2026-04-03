import { NextResponse } from 'next/server';

/**
 * Create a JSON error response. For 500-level errors, always uses a generic
 * message to prevent internal detail leakage. The actual error is logged
 * server-side for debugging.
 */
export function apiError(
  status: number,
  publicMessage: string,
  internalError?: unknown
): NextResponse {
  if (internalError) {
    const detail = internalError instanceof Error ? internalError.message : String(internalError);
    // eslint-disable-next-line no-console
    console.error(`[API ${status}] ${publicMessage}: ${detail}`);
  }
  return NextResponse.json({ error: publicMessage }, { status });
}

/**
 * Validate a required query parameter. Returns the trimmed value or an
 * error response.
 */
export function validateParam(value: string | null, paramName: string): string | NextResponse {
  if (!value?.trim()) {
    return apiError(400, `${paramName} is required`);
  }
  return value.trim();
}
