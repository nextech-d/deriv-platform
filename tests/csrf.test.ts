import { describe, expect, it } from "vitest";
import { CSRF_COOKIE, CSRF_HEADER, createCsrfToken } from "@/lib/auth/csrf";

describe("csrf", () => {
  it("issues unique tokens", () => {
    const first = createCsrfToken();
    const second = createCsrfToken();
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(first).not.toBe(second);
  });

  it("exposes the double-submit cookie and header names", () => {
    expect(CSRF_COOKIE).toBe("deriv_csrf");
    expect(CSRF_HEADER).toBe("x-csrf-token");
  });
});
