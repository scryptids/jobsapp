/**
 * Glue between HTTP requests and state machines.
 *
 * A route action turns the submitted form into a machine event, runs the
 * machine until it pauses for more input or finishes, then maps the
 * resulting state to a response. Multi-step flows persist the paused
 * machine's snapshot in a signed cookie so the next request resumes it.
 *
 * Machines used this way follow these conventions:
 * - states waiting for user input carry the `pause` tag;
 * - context is serializable and holds no secrets (it may end up in a cookie);
 * - outcomes are states (and context), never thrown errors.
 * @module
 */

import type { Cookie } from "react-router";
import type {
  AnyActorLogic,
  AnyStateMachine,
  EventFromLogic,
  InputFrom,
  Snapshot,
  SnapshotFrom,
} from "xstate";

import { runToPause } from "./asyncInterpret";

/**
 * Build a machine event from submitted form data. Only whitelisted event
 * types are accepted, and every other field is passed through as a string.
 * Returns null for a missing or unknown `type`.
 */
export function formDataToEvent<TType extends string>(
  formData: FormData,
  allowedTypes: readonly TType[]
): ({ type: TType } & Record<string, string>) | null {
  const type = formData.get("type");
  if (typeof type !== "string" || !allowedTypes.includes(type as TType)) {
    return null;
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (key !== "type" && typeof value === "string") fields[key] = value;
  }
  return { ...fields, type: type as TType };
}

/**
 * What the cookie holds: the machine id guards against resuming a snapshot
 * written by a different machine.
 */
type StoredSnapshot = { machineId: string; snapshot: Snapshot<unknown> };

async function readSnapshot(
  cookie: Cookie,
  machine: AnyStateMachine,
  request: Request
): Promise<Snapshot<unknown> | undefined> {
  try {
    const stored = (await cookie.parse(
      request.headers.get("Cookie")
    )) as StoredSnapshot | null;
    if (!stored || stored.machineId !== machine.id) return undefined;
    // Make sure the snapshot still fits the machine definition (e.g. after
    // a deploy renamed states); otherwise start over.
    machine.resolveState(stored.snapshot as never);
    return stored.snapshot;
  } catch {
    return undefined;
  }
}

export interface RunMachineRequestOptions<TMachine extends AnyStateMachine> {
  readonly machine: TMachine;
  readonly request: Request;
  /** Event to send; null just (re)starts the machine. */
  readonly event: EventFromLogic<TMachine> | null;
  /** Input for a fresh start; ignored when resuming. */
  readonly input?: InputFrom<TMachine>;
  /**
   * Cookie for persisting the snapshot across requests. Omit for machines
   * that finish within a single request.
   */
  readonly cookie?: Cookie;
  readonly timeoutMs?: number;
}

export interface RunMachineRequestResult<TMachine extends AnyActorLogic> {
  readonly snapshot: SnapshotFrom<TMachine>;
  /** `Set-Cookie` values to send (persist or clear the machine cookie). */
  readonly setCookies: string[];
}

export async function runMachineRequest<TMachine extends AnyStateMachine>({
  machine,
  request,
  event,
  input,
  cookie,
  timeoutMs,
}: RunMachineRequestOptions<TMachine>): Promise<
  RunMachineRequestResult<TMachine>
> {
  const initialState = cookie
    ? await readSnapshot(cookie, machine, request)
    : undefined;

  const { snapshot, persistedSnapshot } = await runToPause(machine, {
    initialState,
    input: initialState ? undefined : input,
    initialEvent: event ?? undefined,
    timeoutMs,
  });

  const setCookies: string[] = [];
  if (cookie) {
    if ((snapshot as Snapshot<unknown>).status === "done") {
      setCookies.push(await cookie.serialize("", { maxAge: 0 }));
    } else {
      const stored: StoredSnapshot = {
        machineId: machine.id,
        snapshot: persistedSnapshot,
      };
      setCookies.push(await cookie.serialize(stored));
    }
  }

  return { snapshot, setCookies };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("formDataToEvent", () => {
    it("accepts whitelisted types and copies string fields", () => {
      const form = new FormData();
      form.set("type", "a.submit");
      form.set("email", "x@y.z");
      expect(formDataToEvent(form, ["a.submit"])).toEqual({
        type: "a.submit",
        email: "x@y.z",
      });
    });
    it("rejects unknown or missing types", () => {
      const form = new FormData();
      expect(formDataToEvent(form, ["a.submit"])).toBeNull();
      form.set("type", "xstate.init");
      expect(formDataToEvent(form, ["a.submit"])).toBeNull();
    });
  });
}
