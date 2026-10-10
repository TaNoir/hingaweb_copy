// JSON and CORS helpers for every Edge Function (00 Section 5.2). Pure JavaScript: runs in Deno and Vitest.

/**
 * @param {string} allowedOrigin  the site origin (ALLOWED_ORIGIN secret), or '*' when unset (local only)
 */
export function makeHttp(allowedOrigin = '*') {
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  return {
    cors,
    /** A JSON response with CORS headers. Never put a raw error message in `body`. */
    json(body, status = 200) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });
    },
    /** Answer for the browser's CORS preflight. */
    preflight() {
      return new Response('ok', { status: 200, headers: cors });
    },
  };
}

/** Reads the Bearer token header, or returns null. */
export function bearer(req) {
  const value = req.headers.get('Authorization') ?? '';
  return /^Bearer\s+\S+/.test(value) ? value : null;
}

/** Parses the JSON body, or returns undefined when it is not valid JSON. */
export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
