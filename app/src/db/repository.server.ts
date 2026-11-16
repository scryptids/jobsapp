/**
 * Data access for the app. Every employer/position method takes the
 * signed-in user's id first and only sees or changes that user's rows,
 * which replaces the per-row permissions Hasura used to enforce.
 *
 * Methods are async so callers (and test spies) don't depend on the driver
 * being synchronous.
 * @module
 */

import { and, asc, count, eq, sql } from "drizzle-orm";

import { getDb } from "./client.server";
import {
  ForeignKeyError,
  isForeignKeyViolation,
  isUniqueViolation,
  UniqueEmailError,
} from "./errors";
import { employers, positions, users } from "./schema";

/** A job as listed in tables. */
export type JobRow = {
  id: number;
  title: string;
  employer: { id: number; name: string } | null;
};

export type JobDetail = JobRow & {
  postingUrl: string | null;
  payRangeLower: number | null;
  payRangeUpper: number | null;
  notes: string | null;
};

export type PositionFields = {
  title: string;
  postingUrl: string | null;
  payRangeLower: number | null;
  payRangeUpper: number | null;
  notes: string | null;
};

export type EmployerFields = { name: string; notes: string | null };

export type EmployerSummary = { id: number; name: string };

export type EmployerDetail = EmployerSummary & {
  notes: string | null;
  positions: JobRow[];
};

const toCents = (amount: number | null) =>
  amount === null ? null : Math.round(amount * 100);
const fromCents = (cents: number | null) => (cents === null ? null : cents / 100);

function positionColumns(fields: PositionFields) {
  return {
    title: fields.title,
    postingUrl: fields.postingUrl,
    payRangeLowerCents: toCents(fields.payRangeLower),
    payRangeUpperCents: toCents(fields.payRangeUpper),
    notes: fields.notes,
  };
}

const jobRowSelect = {
  id: positions.id,
  title: positions.title,
  employerId: employers.id,
  employerName: employers.name,
};

type JobRowRaw = {
  id: number;
  title: string;
  employerId: number | null;
  employerName: string | null;
};

function toJobRow(r: JobRowRaw): JobRow {
  return {
    id: r.id,
    title: r.title,
    employer:
      r.employerId !== null && r.employerName !== null
        ? { id: r.employerId, name: r.employerName }
        : null,
  };
}

/** True when `employerId` is null or one of the user's employers. */
function employerOwned(userId: number, employerId: number | null): boolean {
  if (employerId === null) return true;
  return (
    getDb()
      .select({ id: employers.id })
      .from(employers)
      .where(and(eq(employers.id, employerId), eq(employers.userId, userId)))
      .get() !== undefined
  );
}

export const usersRepo = {
  async byEmail(email: string) {
    const row = getDb()
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .get();
    return row ?? null;
  },

  /** Insert and return the id; throws {@link UniqueEmailError} on a taken email. */
  async insert(email: string, passwordHash: string): Promise<number> {
    try {
      const row = getDb()
        .insert(users)
        .values({ email, passwordHash })
        .returning({ id: users.id })
        .get();
      return row.id;
    } catch (e) {
      if (isUniqueViolation(e, "users.email")) throw new UniqueEmailError();
      throw e;
    }
  },
};

export const employersRepo = {
  /** The user's employers, by name. */
  async list(userId: number): Promise<EmployerSummary[]> {
    return getDb()
      .select({ id: employers.id, name: employers.name })
      .from(employers)
      .where(eq(employers.userId, userId))
      .orderBy(sql`${employers.name} COLLATE NOCASE`, asc(employers.id))
      .all();
  },

  async listWithJobCount(userId: number) {
    return getDb()
      .select({ id: employers.id, name: employers.name, jobCount: count(positions.id) })
      .from(employers)
      .leftJoin(positions, eq(positions.employerId, employers.id))
      .where(eq(employers.userId, userId))
      .groupBy(employers.id)
      .orderBy(sql`${employers.name} COLLATE NOCASE`, asc(employers.id))
      .all();
  },

  /** Null when the employer doesn't exist or isn't the user's. */
  async byId(userId: number, id: number): Promise<EmployerDetail | null> {
    const db = getDb();
    const employer = db
      .select({ id: employers.id, name: employers.name, notes: employers.notes })
      .from(employers)
      .where(and(eq(employers.id, id), eq(employers.userId, userId)))
      .get();
    if (!employer) return null;
    const jobs = db
      .select(jobRowSelect)
      .from(positions)
      .leftJoin(employers, eq(positions.employerId, employers.id))
      .where(and(eq(positions.employerId, id), eq(positions.userId, userId)))
      .orderBy(asc(positions.id))
      .all();
    return { ...employer, positions: jobs.map(toJobRow) };
  },

  /** Number of the employer's jobs, or null if it isn't the user's. */
  async jobCount(userId: number, id: number): Promise<number | null> {
    const row = getDb()
      .select({ id: employers.id, jobCount: count(positions.id) })
      .from(employers)
      .leftJoin(positions, eq(positions.employerId, employers.id))
      .where(and(eq(employers.id, id), eq(employers.userId, userId)))
      .groupBy(employers.id)
      .get();
    return row ? row.jobCount : null;
  },

  /** Id of the user's employer with this name (case-insensitive), or null. */
  async findIdByName(userId: number, name: string): Promise<number | null> {
    const row = getDb()
      .select({ id: employers.id })
      .from(employers)
      .where(
        and(eq(employers.userId, userId), sql`${employers.name} = ${name} COLLATE NOCASE`)
      )
      .orderBy(asc(employers.id))
      .get();
    return row?.id ?? null;
  },

  async insert(userId: number, fields: EmployerFields): Promise<EmployerSummary> {
    return getDb()
      .insert(employers)
      .values({ ...fields, userId })
      .returning({ id: employers.id, name: employers.name })
      .get();
  },

  /** Null when the employer doesn't exist or isn't the user's. */
  async update(
    userId: number,
    id: number,
    fields: EmployerFields
  ): Promise<EmployerSummary | null> {
    const row = getDb()
      .update(employers)
      .set(fields)
      .where(and(eq(employers.id, id), eq(employers.userId, userId)))
      .returning({ id: employers.id, name: employers.name })
      .get();
    return row ?? null;
  },

  /**
   * True when deleted, false when not the user's. Throws
   * {@link ForeignKeyError} while jobs still reference it.
   */
  async delete(userId: number, id: number): Promise<boolean> {
    try {
      const row = getDb()
        .delete(employers)
        .where(and(eq(employers.id, id), eq(employers.userId, userId)))
        .returning({ id: employers.id })
        .get();
      return row !== undefined;
    } catch (e) {
      if (isForeignKeyViolation(e)) throw new ForeignKeyError("The employer still has jobs.");
      throw e;
    }
  },
};

export const positionsRepo = {
  /** The user's jobs in creation order. */
  async list(
    userId: number,
    { limit, offset = 0 }: { limit: number; offset?: number }
  ): Promise<JobRow[]> {
    return getDb()
      .select(jobRowSelect)
      .from(positions)
      .leftJoin(employers, eq(positions.employerId, employers.id))
      .where(eq(positions.userId, userId))
      .orderBy(asc(positions.id))
      .limit(limit)
      .offset(offset)
      .all()
      .map(toJobRow);
  },

  /** Null when the job doesn't exist or isn't the user's. */
  async byId(userId: number, id: number): Promise<JobDetail | null> {
    const row = getDb()
      .select({
        ...jobRowSelect,
        postingUrl: positions.postingUrl,
        payRangeLowerCents: positions.payRangeLowerCents,
        payRangeUpperCents: positions.payRangeUpperCents,
        notes: positions.notes,
      })
      .from(positions)
      .leftJoin(employers, eq(positions.employerId, employers.id))
      .where(and(eq(positions.id, id), eq(positions.userId, userId)))
      .get();
    if (!row) return null;
    return {
      ...toJobRow(row),
      postingUrl: row.postingUrl,
      payRangeLower: fromCents(row.payRangeLowerCents),
      payRangeUpper: fromCents(row.payRangeUpperCents),
      notes: row.notes,
    };
  },

  /**
   * Insert a job. Attaches `employerId` (which must be the user's) or, when
   * it is null and `newEmployerName` is set, creates that employer in the
   * same transaction.
   */
  async insert(
    userId: number,
    fields: PositionFields,
    employer: { employerId: number | null; newEmployerName?: string | null }
  ): Promise<{ id: number; title: string }> {
    const db = getDb();
    return db.transaction((tx) => {
      let employerId = employer.employerId;
      if (!employerOwned(userId, employerId)) {
        throw new ForeignKeyError("Employer not found for this user.");
      }
      if (employerId === null && employer.newEmployerName) {
        employerId = tx
          .insert(employers)
          .values({ name: employer.newEmployerName, userId })
          .returning({ id: employers.id })
          .get().id;
      }
      return tx
        .insert(positions)
        .values({ ...positionColumns(fields), employerId, userId })
        .returning({ id: positions.id, title: positions.title })
        .get();
    });
  },

  /** Null when the job doesn't exist or isn't the user's. */
  async update(
    userId: number,
    id: number,
    fields: PositionFields & { employerId: number | null }
  ): Promise<{ id: number; title: string } | null> {
    if (!employerOwned(userId, fields.employerId)) {
      throw new ForeignKeyError("Employer not found for this user.");
    }
    const row = getDb()
      .update(positions)
      .set({ ...positionColumns(fields), employerId: fields.employerId })
      .where(and(eq(positions.id, id), eq(positions.userId, userId)))
      .returning({ id: positions.id, title: positions.title })
      .get();
    return row ?? null;
  },

  /** True when deleted, false when it doesn't exist or isn't the user's. */
  async delete(userId: number, id: number): Promise<boolean> {
    const row = getDb()
      .delete(positions)
      .where(and(eq(positions.id, id), eq(positions.userId, userId)))
      .returning({ id: positions.id })
      .get();
    return row !== undefined;
  },
};
