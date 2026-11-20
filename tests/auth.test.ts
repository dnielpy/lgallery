import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkCredentials,
  createSessionToken,
  isValidSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "@/src/modules/auth/server/session";

describe("session", () => {
  beforeEach(() => {
    vi.stubEnv("LGALLERY_USERNAME", "admin");
    vi.stubEnv("LGALLERY_PASSWORD", "*PasswordSafe");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the configured user and password", () => {
    expect(checkCredentials("admin", "*PasswordSafe")).toBe(true);
    expect(checkCredentials(" admin ", "*PasswordSafe")).toBe(true);
    expect(checkCredentials("admin", "wrong")).toBe(false);
    expect(checkCredentials("someone", "*PasswordSafe")).toBe(false);
    expect(checkCredentials(undefined, undefined)).toBe(false);
  });

  it("defaults the user to admin", () => {
    vi.stubEnv("LGALLERY_USERNAME", "");
    expect(checkCredentials("admin", "*PasswordSafe")).toBe(true);
  });

  it("rejects everyone when no password is configured", () => {
    vi.stubEnv("LGALLERY_PASSWORD", "");
    expect(checkCredentials("admin", "")).toBe(false);
    expect(isValidSessionToken("1.abc")).toBe(false);
  });

  it("keeps a session valid until it expires", () => {
    const now = Date.UTC(2026, 10, 20);
    const token = createSessionToken(now);
    expect(isValidSessionToken(token, now + 1_000)).toBe(true);
    expect(isValidSessionToken(token, now + SESSION_MAX_AGE_SECONDS * 1000)).toBe(false);
  });

  it("rejects tampered tokens and tokens signed with an old password", () => {
    const token = createSessionToken();
    const [expires, signature] = token.split(".");
    expect(isValidSessionToken(`${Number(expires) + 60}.${signature}`)).toBe(false);
    expect(isValidSessionToken("garbage")).toBe(false);
    vi.stubEnv("LGALLERY_PASSWORD", "a new password");
    expect(isValidSessionToken(token)).toBe(false);
  });
});
