import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { SessionPayload, SessionUser } from "./types";

const COOKIE_NAME = "cms_session";
const SECRET = process.env.SESSION_SECRET || "cms-demo-secret-change-me";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function encodeSession(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function setSessionPayload(payload: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Full payload including the plaintext password, for server-only local re-verification. */
export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

/** Client-safe view of the session (never includes the password). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const { pw, ...user } = payload;
  void pw;
  return user;
}

export { COOKIE_NAME };
