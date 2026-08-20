import { afterEach, describe, expect, it } from "vitest";
import { isAuthorized } from "@/lib/admin/auth";

const ORIGINAL_SECRET = process.env.ADMIN_SECRET;

function requestWithAuth(header?: string): Request {
  const headers = new Headers();
  if (header) headers.set("authorization", header);
  return new Request("http://localhost/api/admin/agents", { headers });
}

describe("admin Bearer auth", () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.ADMIN_SECRET;
    } else {
      process.env.ADMIN_SECRET = ORIGINAL_SECRET;
    }
  });

  it("rejects when ADMIN_SECRET is unset", () => {
    delete process.env.ADMIN_SECRET;
    expect(isAuthorized(requestWithAuth("Bearer anything"))).toBe(false);
  });

  it("rejects when ADMIN_SECRET is blank", () => {
    process.env.ADMIN_SECRET = "   ";
    expect(isAuthorized(requestWithAuth("Bearer    "))).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    process.env.ADMIN_SECRET = "e2e-test-admin-secret-min-32-chars!!";
    expect(isAuthorized(requestWithAuth())).toBe(false);
  });

  it("rejects an invalid token", () => {
    process.env.ADMIN_SECRET = "e2e-test-admin-secret-min-32-chars!!";
    expect(isAuthorized(requestWithAuth("Bearer wrong-token"))).toBe(false);
  });

  it("accepts the matching Bearer token", () => {
    process.env.ADMIN_SECRET = "e2e-test-admin-secret-min-32-chars!!";
    expect(
      isAuthorized(
        requestWithAuth("Bearer e2e-test-admin-secret-min-32-chars!!"),
      ),
    ).toBe(true);
  });
});
