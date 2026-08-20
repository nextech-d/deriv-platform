export const CSRF_COOKIE = "deriv_csrf";
export const CSRF_HEADER = "x-csrf-token";

const CSRF_MAX_AGE = 60 * 60 * 24 * 7;

type CookieWriter = {
  cookies: {
    set: (name: string, value: string, options?: Record<string, unknown>) => void;
  };
};

export function createCsrfToken(): string {
  return crypto.randomUUID();
}

export function applyCsrfCookie(response: CookieWriter, token: string): void {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_MAX_AGE,
  });
}

export function clearCsrfCookie(response: CookieWriter): void {
  response.cookies.set(CSRF_COOKIE, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readBrowserCsrf(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${CSRF_COOKIE}=`;
  const row = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

export function withCsrfHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = readBrowserCsrf();
  if (token) headers.set(CSRF_HEADER, token);
  return headers;
}

export async function ensureCsrfCookie(): Promise<string | null> {
  const existing = readBrowserCsrf();
  if (existing) return existing;
  try {
    await fetch("/api/auth/session", { credentials: "same-origin" });
  } catch {
    return readBrowserCsrf();
  }
  return readBrowserCsrf();
}

export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  await ensureCsrfCookie();
  return fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: withCsrfHeaders(init?.headers),
  });
}
