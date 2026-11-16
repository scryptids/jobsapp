/**
 * In-memory stand-in for the generated Hasura SDK, so route and service code
 * runs for real in tests without a GraphQL server.
 *
 * It mimics the Hasura behaviour the app relies on: the `user` role only sees
 * and changes its own rows (user id read from the bearer JWT), and inserting a
 * duplicate email fails on the `users_email_key` constraint.
 *
 * Usage in a test file:
 * ```ts
 * const fake = vi.hoisted(() => ({ sdk: undefined as unknown as FakeSdk }));
 * vi.mock("~/api.server", async () => {
 *   const { createFakeSdk } = await import("~/test/fakeSdk");
 *   fake.sdk = createFakeSdk();
 *   return { sdk: fake.sdk, adminSdk: fake.sdk };
 * });
 * ```
 * @module
 */

import { ClientError } from "graphql-request";
import * as jose from "jose";

import type { Positions_Insert_Input, Sdk } from "~/graphql/_generated";

export type FakeUser = { id: number; email: string; password_hash: string | null };
export type FakeEmployer = { id: number; name: string; user_id: number };
export type FakePosition = {
  id: number;
  title: string;
  posting_url: string | null;
  pay_range_lower: number | null;
  pay_range_upper: number | null;
  employer_id: number | null;
  user_id: number;
};

export type FakeDb = {
  users: FakeUser[];
  employers: FakeEmployer[];
  positions: FakePosition[];
};

type Headers = Record<string, string> | undefined;

export type FakeSdk = Sdk & {
  db: FakeDb;
  /** Make the named operation reject once with a generic error. */
  failNext(operation: keyof Sdk): void;
  /** Clear all data and pending failures. */
  reset(): void;
};

function userIdFromHeaders(headers: Headers): number {
  const auth = headers?.authorization ?? "";
  const token = auth.replace(/^Bearer /, "");
  if (!token) throw new Error("fakeSdk: missing bearer token");
  const claims = jose.decodeJwt(token)["https://hasura.io/jwt/claims"] as
    | Record<string, string>
    | undefined;
  const id = Number(claims?.["X-Hasura-User-Id"]);
  if (!Number.isInteger(id)) throw new Error("fakeSdk: no user id in token");
  return id;
}

function emailTakenError(): ClientError {
  return new ClientError(
    {
      status: 200,
      headers: new Headers() as never,
      errors: [
        {
          message:
            'Uniqueness violation. duplicate key value violates unique constraint "users_email_key"',
          extensions: { code: "constraint-violation", path: "$" },
        } as never,
      ],
    },
    { query: "insertUser" }
  );
}

/** `_ilike` without wildcards, as `employerByName` uses it. */
function ilikeEquals(value: string, escapedPattern: string): boolean {
  const pattern = escapedPattern.replace(/\\(.)/g, "$1");
  return value.toLowerCase() === pattern.toLowerCase();
}

function toNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export function createFakeSdk(): FakeSdk {
  const db: FakeDb = { users: [], employers: [], positions: [] };
  let nextId = 1;
  const failures = new Set<string>();

  function maybeFail(operation: string) {
    if (failures.delete(operation)) {
      throw new Error(`fakeSdk: injected failure in ${operation}`);
    }
  }

  function employerName(id: number | null) {
    const employer = db.employers.find((e) => e.id === id);
    return employer ? { name: employer.name } : null;
  }

  function positionsFor(userId: number) {
    return db.positions
      .filter((p) => p.user_id === userId)
      .sort((a, b) => a.id - b.id)
      .map((p) => ({ id: p.id, title: p.title, employer: employerName(p.employer_id) }));
  }

  const sdk: Omit<FakeSdk, "db" | "failNext" | "reset"> = {
    async employers({ limit = 10, user_id }) {
      maybeFail("employers");
      return {
        employers: db.employers
          .filter((e) => e.user_id === user_id)
          .slice(0, limit)
          .map(({ id, name }) => ({ id, name })),
      };
    },

    async myEmployers(_variables, headers) {
      maybeFail("myEmployers");
      const userId = userIdFromHeaders(headers as Headers);
      return {
        employers: db.employers
          .filter((e) => e.user_id === userId)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ id, name }) => ({ id, name })),
      };
    },

    async employerByName({ name }, headers) {
      maybeFail("employerByName");
      const userId = userIdFromHeaders(headers as Headers);
      const match = db.employers.find(
        (e) => e.user_id === userId && ilikeEquals(e.name, name)
      );
      return { employers: match ? [{ id: match.id }] : [] };
    },

    async positions(variables, headers) {
      maybeFail("positions");
      const userId = userIdFromHeaders(headers as Headers);
      return { positions: positionsFor(userId).slice(0, variables?.limit ?? 10) };
    },

    async positionsPage({ limit, offset }, headers) {
      maybeFail("positionsPage");
      const userId = userIdFromHeaders(headers as Headers);
      return { positions: positionsFor(userId).slice(offset, offset + limit) };
    },

    async insertPosition({ object }, headers) {
      maybeFail("insertPosition");
      const userId = userIdFromHeaders(headers as Headers);
      const input = object as Positions_Insert_Input;

      let employerId = input.employer_id ?? null;
      if (employerId !== null) {
        const owned = db.employers.some(
          (e) => e.id === employerId && e.user_id === userId
        );
        if (!owned) throw new Error("fakeSdk: employer not owned by user");
      }
      if (input.employer) {
        employerId = nextId++;
        db.employers.push({
          id: employerId,
          name: String(input.employer.data.name),
          user_id: userId,
        });
      }

      const position: FakePosition = {
        id: nextId++,
        title: String(input.title),
        posting_url: input.posting_url ?? null,
        pay_range_lower: toNumberOrNull(input.pay_range_lower),
        pay_range_upper: toNumberOrNull(input.pay_range_upper),
        employer_id: employerId,
        user_id: userId,
      };
      db.positions.push(position);
      return { insert_positions_one: { id: position.id, title: position.title } };
    },

    async deletePosition({ id }, headers) {
      maybeFail("deletePosition");
      const userId = userIdFromHeaders(headers as Headers);
      const index = db.positions.findIndex(
        (p) => p.id === id && p.user_id === userId
      );
      if (index === -1) return { delete_positions_by_pk: null };
      db.positions.splice(index, 1);
      return { delete_positions_by_pk: { id } };
    },

    async userByEmail({ email }) {
      maybeFail("userByEmail");
      const user = db.users.find((u) => u.email === email);
      return {
        users: user ? [{ id: user.id, password_hash: user.password_hash }] : [],
      };
    },

    async insertUser({ email, passwordHash }) {
      maybeFail("insertUser");
      if (db.users.some((u) => u.email === email)) throw emailTakenError();
      const user: FakeUser = { id: nextId++, email, password_hash: passwordHash };
      db.users.push(user);
      return { insert_users_one: { id: user.id } };
    },
  };

  return Object.assign(sdk, {
    db,
    failNext(operation: keyof Sdk) {
      failures.add(operation);
    },
    reset() {
      db.users.length = 0;
      db.employers.length = 0;
      db.positions.length = 0;
      failures.clear();
      nextId = 1;
    },
  }) as FakeSdk;
}
