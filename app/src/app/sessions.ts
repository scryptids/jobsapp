import {
  createCookie,
  createCookieSessionStorage,
  redirect,
  type Session,
  type SessionStorage,
} from "react-router";

import { cookieSecrets, secureCookies } from "./cookies";

type SessionData = {
  userId: number;
};

type SessionFlashData = {
  error: string;
};

export function getSessionUserId(session: Session) {
  return session.get("userId");
}

export async function initSession(
  session: Session,
  userId: number
): Promise<Session> {
  session.set("userId", userId);
  return session;
}

const sessionCookie = createCookie("__session", {
  secrets: cookieSecrets(),
  // 30 days
  maxAge: 30 * 24 * 60 * 60,
  httpOnly: true,
  secure: secureCookies(),
  sameSite: "lax",
});

const _sessionStorage = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({ cookie: sessionCookie });

if (typeof _sessionStorage === "undefined") {
  throw new Error("session storage is not properly configured.");
}

export const sessionStorage: SessionStorage = _sessionStorage;

/**
 * Start a session for `userId` and redirect, committing the session cookie
 * along with any `extraSetCookies` (e.g. clearing a flow's machine cookie).
 */
export async function createUserSessionRedirect(
  request: Request,
  userId: number,
  redirectTo: string,
  extraSetCookies: readonly string[] = []
) {
  const session = await initSession(
    await _sessionStorage.getSession(request.headers.get("Cookie")),
    userId
  );
  const headers = new Headers();
  headers.append("Set-Cookie", await _sessionStorage.commitSession(session));
  for (const cookie of extraSetCookies) headers.append("Set-Cookie", cookie);
  return redirect(redirectTo, { headers });
}

export async function requireAuthSession(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  if (!session.has("userId")) {
    throw redirect("/login");
  }
  return session;
}

/** The signed-in user's id; redirects to /login without a session. */
export async function requireUserId(request: Request): Promise<number> {
  const session = await requireAuthSession(request);
  const userId = Number(session.get("userId"));
  if (!Number.isInteger(userId)) throw redirect("/login");
  return userId;
}
