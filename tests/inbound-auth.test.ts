import { describe, expect, it } from "vitest";
import { parseInboundAuth } from "@/lib/auth/inbound-auth";

describe("parseInboundAuth", () => {
  it("reads PKCE code and state", () => {
    const url = new URL("https://tradecity.trade/api/auth/callback?code=abc&state=xyz");
    expect(parseInboundAuth(url)).toEqual({
      kind: "oauth_code",
      code: "abc",
      state: "xyz",
    });
  });

  it("reads legacy token1", () => {
    const url = new URL(
      "https://tradecity.trade/api/auth/callback?acct1=CR123&token1=a1-abcdefghijklmnopqrstuv",
    );
    expect(parseInboundAuth(url)).toEqual({
      kind: "legacy_token",
      token: "a1-abcdefghijklmnopqrstuv",
    });
  });

  it("reads email verification token", () => {
    const url = new URL("https://tradecity.trade/verify?token=verify-token-here");
    expect(parseInboundAuth(url)).toEqual({
      kind: "verify",
      token: "verify-token-here",
    });
  });

  it("reads OAuth error", () => {
    const url = new URL(
      "https://tradecity.trade/api/auth/callback?error=access_denied",
    );
    expect(parseInboundAuth(url)).toEqual({
      kind: "oauth_error",
      error: "access_denied",
    });
  });

  it("returns empty when no auth params", () => {
    const url = new URL("https://tradecity.trade/api/auth/callback");
    expect(parseInboundAuth(url)).toEqual({ kind: "empty" });
  });
});
