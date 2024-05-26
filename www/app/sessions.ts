import {
  createCookie,
  createMemorySessionStorage,
  createSessionStorage,
  redirect,
  Session,
  type SessionStorage,
} from "@remix-run/node";

type SessionData = {
  userId: string;
  hasuraAccessToken: string;
}

type SessionFlashData = {
  error: string;
}

export async function getSessionUserId(session: Session) {
  return session.get("userId");
}

export async function getSessionHasuraToken(session: Session) {
  return session.get("hasuraAccessToken");
}

let secret = process.env.COOKIE_SECRET || "default";
if (secret === "default") {
  console.warn(
    "🚨 No COOKIE_SECRET environment variable set, using 'default'. The app is insecure in production.",
  );
  secret = "default-secret";
}

const sessionCookie = createCookie("__session", {
  secrets: [secret],
  // 30 days
  maxAge: 30 * 24 * 60 * 60,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

let _sessionStorage
const testAndProdEnvs = ['test', 'production']

if (testAndProdEnvs.includes(process.env.NODE_ENV)) {
  // For test and production deployments, we use a persistent database.
  throw new Error("not implemented")
  _sessionStorage = createSessionStorage<SessionData, SessionFlashData>({
    cookie: sessionCookie,
    async createData(data, expires) {
      throw new Error("not implemented")
    },
    async readData(id) {
      throw new Error("not implemented")
    },
    async updateData(id, data, expires) {
      throw new Error("not implemented")
    },
    async deleteData(id) {
      throw new Error("not implemented")
    },
  });
} else {
  // For development deployments, we use transient in-memory storage.
  _sessionStorage = createMemorySessionStorage<SessionData, SessionFlashData>({
    cookie: sessionCookie,
  });
}

if (typeof _sessionStorage === "undefined") {
  throw new Error("session storage is not properly configured.");
}

export const sessionStorage: SessionStorage = _sessionStorage

export async function requireAuthSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  if (!session.has("userId")) {
    throw redirect("/login");
  }
  return session;
}