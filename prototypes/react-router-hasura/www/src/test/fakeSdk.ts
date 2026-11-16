/**
 * In-memory stand-in for the generated Hasura SDK, so route and service code
 * runs for real in tests without a GraphQL server.
 *
 * It mimics the Hasura behaviour the app relies on: the `user` role only sees
 * and changes its own rows (user id read from the bearer JWT), inserting a
 * duplicate email fails on the `users_email_key` constraint, and deleting an
 * employer that still has jobs fails on the positions foreign key.
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
export type FakeEmployer = {
  id: number;
  name: string;
  notes?: string | null;
  user_id: number;
};
export type FakePosition = {
  id: number;
  title: string;
  posting_url: string | null;
  pay_range_lower: number | null;
  pay_range_upper: number | null;
  notes?: string | null;
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

function foreignKeyError(): ClientError {
  return new ClientError(
    {
      status: 200,
      headers: new Headers() as never,
      errors: [
        {
          message:
            'Foreign key violation. update or delete on table "employers" violates foreign key constraint "positions_employer_id_fkey" on table "positions"',
          extensions: { code: "constraint-violation", path: "$" },
        } as never,
      ],
    },
    { query: "deleteEmployer" }
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

  function employerRef(id: number | null) {
    const employer = db.employers.find((e) => e.id === id);
    return employer ? { id: employer.id, name: employer.name } : null;
  }

  function positionsFor(userId: number) {
    return db.positions
      .filter((p) => p.user_id === userId)
      .sort((a, b) => a.id - b.id)
      .map((p) => ({ id: p.id, title: p.title, employer: employerRef(p.employer_id) }));
  }

  function ownedEmployer(id: number, userId: number) {
    return db.employers.find((e) => e.id === id && e.user_id === userId);
  }

  function ownedPosition(id: number, userId: number) {
    return db.positions.find((p) => p.id === id && p.user_id === userId);
  }

  function jobCount(employerId: number) {
    return db.positions.filter((p) => p.employer_id === employerId).length;
  }

  /** Hasura's employer-ownership permission check on positions. */
  function assertEmployerOwned(employerId: number | null, userId: number) {
    if (employerId !== null && !ownedEmployer(employerId, userId)) {
      throw new Error("fakeSdk: employer not owned by user");
    }
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
      assertEmployerOwned(employerId, userId);
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
        notes: input.notes ?? null,
        employer_id: employerId,
        user_id: userId,
      };
      db.positions.push(position);
      return { insert_positions_one: { id: position.id, title: position.title } };
    },

    async positionById({ id }, headers) {
      maybeFail("positionById");
      const p = ownedPosition(id, userIdFromHeaders(headers as Headers));
      return {
        positions_by_pk: p
          ? {
              id: p.id,
              title: p.title,
              posting_url: p.posting_url,
              pay_range_lower: p.pay_range_lower,
              pay_range_upper: p.pay_range_upper,
              notes: p.notes ?? null,
              employer: employerRef(p.employer_id),
            }
          : null,
      };
    },

    async updatePosition({ id, set }, headers) {
      maybeFail("updatePosition");
      const userId = userIdFromHeaders(headers as Headers);
      const p = ownedPosition(id, userId);
      if (!p) return { update_positions_by_pk: null };
      if (set.employer_id !== undefined) assertEmployerOwned(set.employer_id ?? null, userId);
      if (set.title !== undefined) p.title = String(set.title);
      if (set.posting_url !== undefined) p.posting_url = set.posting_url ?? null;
      if (set.pay_range_lower !== undefined) p.pay_range_lower = toNumberOrNull(set.pay_range_lower);
      if (set.pay_range_upper !== undefined) p.pay_range_upper = toNumberOrNull(set.pay_range_upper);
      if (set.notes !== undefined) p.notes = set.notes ?? null;
      if (set.employer_id !== undefined) p.employer_id = set.employer_id ?? null;
      return { update_positions_by_pk: { id: p.id, title: p.title } };
    },

    async myEmployersWithJobCount(_variables, headers) {
      maybeFail("myEmployersWithJobCount");
      const userId = userIdFromHeaders(headers as Headers);
      return {
        employers: db.employers
          .filter((e) => e.user_id === userId)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ id, name }) => ({
            id,
            name,
            positions_aggregate: { aggregate: { count: jobCount(id) } },
          })),
      };
    },

    async employerById({ id }, headers) {
      maybeFail("employerById");
      const userId = userIdFromHeaders(headers as Headers);
      const e = ownedEmployer(id, userId);
      return {
        employers_by_pk: e
          ? {
              id: e.id,
              name: e.name,
              notes: e.notes ?? null,
              positions: positionsFor(userId).filter((p) => p.employer?.id === e.id),
            }
          : null,
      };
    },

    async employerJobCount({ id }, headers) {
      maybeFail("employerJobCount");
      const e = ownedEmployer(id, userIdFromHeaders(headers as Headers));
      return {
        employers_by_pk: e
          ? { id: e.id, positions_aggregate: { aggregate: { count: jobCount(e.id) } } }
          : null,
      };
    },

    async insertEmployer({ object }, headers) {
      maybeFail("insertEmployer");
      const employer: FakeEmployer = {
        id: nextId++,
        name: String(object.name),
        notes: object.notes ?? null,
        user_id: userIdFromHeaders(headers as Headers),
      };
      db.employers.push(employer);
      return { insert_employers_one: { id: employer.id, name: employer.name } };
    },

    async updateEmployer({ id, set }, headers) {
      maybeFail("updateEmployer");
      const e = ownedEmployer(id, userIdFromHeaders(headers as Headers));
      if (!e) return { update_employers_by_pk: null };
      if (set.name !== undefined) e.name = String(set.name);
      if (set.notes !== undefined) e.notes = set.notes ?? null;
      return { update_employers_by_pk: { id: e.id, name: e.name } };
    },

    async deleteEmployer({ id }, headers) {
      maybeFail("deleteEmployer");
      const e = ownedEmployer(id, userIdFromHeaders(headers as Headers));
      if (!e) return { delete_employers_by_pk: null };
      if (jobCount(id) > 0) throw foreignKeyError();
      db.employers.splice(db.employers.indexOf(e), 1);
      return { delete_employers_by_pk: { id } };
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
