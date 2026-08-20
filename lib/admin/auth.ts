import { timingSafeEqual } from "node:crypto";

function secretsEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Bearer `ADMIN_SECRET` gate for `/api/admin/*`. Never true if the secret is unset. */
export function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return secretsEqual(auth.slice("Bearer ".length), secret);
}
