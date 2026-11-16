/**
 * Action-only route: POST /dash/employers/:employerId/delete removes one of
 * the signed-in user's employers, if it has no jobs. With a `returnTo` field,
 * a successful delete redirects there.
 * @module
 */

import { data, redirect, type ActionFunctionArgs } from "react-router";

import { deleteEmployerMachineFor } from "~/features/employers/deleteEmployerMachine.server";
import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { runMachineRequest } from "~/utils/machineRequest.server";
import { readReturnTo } from "~/utils/returnTo";

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await requireAuthSession(request);
  const returnTo = await readReturnTo(request);

  const { snapshot } = await runMachineRequest({
    machine: deleteEmployerMachineFor(getSessionHasuraToken(session)!),
    request,
    event: null,
    input: { employerId: params.employerId },
  });

  if (snapshot.matches("deleted")) {
    if (returnTo) throw redirect(returnTo);
    return data({ ok: true as const, reason: null });
  }
  if (snapshot.matches("invalid")) {
    return data({ ok: false as const, reason: "invalid" as const }, { status: 400 });
  }
  if (snapshot.matches("notFound")) {
    return data({ ok: false as const, reason: "not-found" as const }, { status: 404 });
  }
  if (snapshot.matches("hasJobs")) {
    return data({ ok: false as const, reason: "has-jobs" as const }, { status: 409 });
  }
  return data({ ok: false as const, reason: "error" as const }, { status: 500 });
}
