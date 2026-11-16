/**
 * Helpers for testing route loaders and actions with plain `Request`
 * objects, without a running server or browser.
 * @module
 */

import { initSession, sessionStorage } from "~/app/sessions";

const origin = "http://app.test";

/** Build a POST request with an urlencoded form body, like a browser form. */
export function formRequest(
  path: string,
  fields: Record<string, string> = {},
  { cookie }: { cookie?: string } = {}
): Request {
  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
  });
  if (cookie) headers.set("Cookie", cookie);
  return new Request(new URL(path, origin), {
    method: "POST",
    headers,
    body: new URLSearchParams(fields),
  });
}

/** Build a GET request. */
export function getRequest(
  path: string,
  { cookie }: { cookie?: string } = {}
): Request {
  const headers = new Headers();
  if (cookie) headers.set("Cookie", cookie);
  return new Request(new URL(path, origin), { headers });
}

/** A `Cookie` header value for a signed-in user. */
export async function authedCookie(userId: number): Promise<string> {
  const session = await initSession(await sessionStorage.getSession(), userId);
  const setCookie = await sessionStorage.commitSession(session);
  return setCookie.split(";")[0];
}

/**
 * Minimal cookie jar: remembers `Set-Cookie` values from responses and
 * replays them as a `Cookie` header, so tests can walk multi-request flows.
 */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  /** Remember cookies set by a `Response` or a `data()` result. */
  store(result: unknown): this {
    for (const header of setCookiesOf(result)) {
      const [pair, ...attributes] = header.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attributes.some((a) => {
        const [key, val] = a.trim().split("=");
        const k = key.toLowerCase();
        return (
          (k === "max-age" && Number(val) <= 0) ||
          (k === "expires" && new Date(val).getTime() <= Date.now())
        );
      });
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return this;
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

/** `Set-Cookie` values of a `Response` or a `data()` result. */
export function setCookiesOf(result: unknown): string[] {
  if (result instanceof Response) return result.headers.getSetCookie();
  const init = (result as DataResult<unknown> | null)?.init;
  return init?.headers ? new Headers(init.headers).getSetCookie() : [];
}

/** Names of the cookies a result sets, cleared ones included. */
export function setCookieNames(result: unknown): string[] {
  return setCookiesOf(result).map((c) => c.slice(0, c.indexOf("=")).trim());
}

function isDataResult(value: unknown): value is DataResult<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "DataWithResponseInit"
  );
}

/**
 * Run a loader or action and return what it produced. Thrown responses
 * (e.g. `throw redirect(...)` or `throw data(null, { status: 404 })`) are
 * returned instead of rethrown.
 */
export async function run<T>(fn: () => Promise<T>): Promise<T | Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Response) return e;
    if (isDataResult(e)) return e as T;
    throw e;
  }
}

/** `data()` results from React Router: `{ type: "DataWithResponseInit", data, init }`. */
export type DataResult<T> = { data: T; init: ResponseInit | null };

/** Status of a loader/action result, whether a `Response` or `data()`. */
export function statusOf(result: unknown): number {
  if (result instanceof Response) return result.status;
  const init = (result as DataResult<unknown> | null)?.init;
  return init?.status ?? 200;
}

/** Body of a `data()` result. */
export function dataOf<T>(result: unknown): T {
  return (result as DataResult<T>).data;
}

/** `Location` of a redirect response, or null. */
export function locationOf(result: unknown): string | null {
  return result instanceof Response ? result.headers.get("Location") : null;
}
