import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "lgallery-session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type Credentials = { username: string; password: string };

function getCredentials(): Credentials | null {
  const password = process.env.LGALLERY_PASSWORD;
  if (!password) return null;
  return { username: process.env.LGALLERY_USERNAME?.trim() || "admin", password };
}

function sameText(a: string, b: string) {
  // Hashing first gives both sides the same length, so the comparison takes the same time for any input.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

// Signing with the credentials themselves logs everyone out when the user or the password changes.
function sign(credentials: Credentials, expiresAt: number) {
  const key = createHash("sha256").update(`${credentials.username}\0${credentials.password}`).digest();
  return createHmac("sha256", key).update(`${credentials.username}.${expiresAt}`).digest("base64url");
}

export function isAuthConfigured() {
  return getCredentials() !== null;
}

export function checkCredentials(username: unknown, password: unknown) {
  const credentials = getCredentials();
  if (!credentials || typeof username !== "string" || typeof password !== "string") return false;
  // Both are compared so a wrong user takes as long as a wrong password.
  const userMatches = sameText(username.trim(), credentials.username);
  const passwordMatches = sameText(password, credentials.password);
  return userMatches && passwordMatches;
}

export function createSessionToken(now = Date.now()) {
  const credentials = getCredentials();
  if (!credentials) throw new Error("LGALLERY_PASSWORD is not configured.");
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${expiresAt}.${sign(credentials, expiresAt)}`;
}

export function isValidSessionToken(token: string | undefined, now = Date.now()) {
  const credentials = getCredentials();
  if (!credentials || !token) return false;
  const [expires, signature] = token.split(".");
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= now || !signature) return false;
  return sameText(signature, sign(credentials, expiresAt));
}

/** The session token in a raw Cookie header, for routes that only have the plain Request. */
export function sessionFromCookieHeader(header: string | null) {
  for (const part of header?.split(";") ?? []) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return value.join("=");
  }
  return undefined;
}
