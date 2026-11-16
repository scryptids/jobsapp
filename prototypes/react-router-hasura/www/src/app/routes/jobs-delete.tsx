/**
 * Action-only route: POST /dash/jobs/:jobId/delete removes one of the
 * signed-in user's jobs. Submitted by the jobs table's row menu.
 * @module
 */

import { data, type ActionFunctionArgs } from "react-router";

import { deleteJobMachineFor } from "src/features/jobs/deleteJobMachine.server";
import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { runMachineRequest } from "~/utils/machineRequest.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await requireAuthSession(request);

  const { snapshot } = await runMachineRequest({
    machine: deleteJobMachineFor(getSessionHasuraToken(session)!),
    request,
    event: null,
    input: { jobId: params.jobId },
  });

  if (snapshot.matches("deleted")) {
    return data({ ok: true as const, reason: null });
  }
  if (snapshot.matches("invalid")) {
    return data({ ok: false as const, reason: "invalid" as const }, { status: 400 });
  }
  if (snapshot.matches("notFound")) {
    return data({ ok: false as const, reason: "not-found" as const }, { status: 404 });
  }
  return data({ ok: false as const, reason: "error" as const }, { status: 500 });
}
