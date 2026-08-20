import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { defaultSession, type SessionData } from "./types";

export type { DerivAccount, SessionData } from "./types";

function getSessionPassword(): string {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set and at least 32 characters");
    }
    return "dev-only-session-secret-min-32-chars!!";
  }
  return password;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: "deriv_platform_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function getSessionOrDefault(): Promise<SessionData> {
  try {
    const session = await getSession();
    return { ...defaultSession, ...session };
  } catch {
    return defaultSession;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.accessToken) {
    throw new Error("Unauthorized");
  }

  const { isTokenExpiringSoon, refreshAccessToken } = await import(
    "@/lib/auth/session-from-token"
  );
  if (isTokenExpiringSoon(session.expiresAt)) {
    const ok = await refreshAccessToken();
    if (!ok) {
      throw new Error("Unauthorized");
    }
    return getSession();
  }

  return session;
}
