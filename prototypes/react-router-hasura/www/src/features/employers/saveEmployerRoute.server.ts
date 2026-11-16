/**
 * Shared action for the employer create and edit pages.
 * @module
 */

import { data, redirect } from "react-router";

import { requireAuthSession, getSessionHasuraToken } from "~/app/sessions";
import { employerDetailPath } from "~/app/routes";
import { formDataToEvent, runMachineRequest } from "~/utils/machineRequest.server";
import { returnToParam, safeReturnTo } from "~/utils/returnTo";
import { saveEmployerMachineFor } from "./saveEmployerMachine.server";

/**
 * Run the save-employer machine for a submitted form. Redirects on success
 * (to `returnTo`, or the employer's page); otherwise returns the problem.
 * `employerId: null` creates.
 */
export async function saveEmployerAction(
  request: Request,
  employerId: string | undefined | null
) {
  const session = await requireAuthSession(request);
  const event = formDataToEvent(await request.formData(), ["employer.submit"] as const);
  if (!event) {
    return data({ status: "error" as const, fieldErrors: null }, { status: 400 });
  }

  const { snapshot } = await runMachineRequest({
    machine: saveEmployerMachineFor(getSessionHasuraToken(session)!),
    request,
    input: { employerId },
    event: { type: event.type, name: event.name ?? "", notes: event.notes ?? "" },
  });

  if (snapshot.matches("saved") && snapshot.output?.employer) {
    throw redirect(
      safeReturnTo(event[returnToParam], employerDetailPath(snapshot.output.employer.id))
    );
  }
  if (snapshot.matches("notFound") || snapshot.matches("invalid")) {
    return data({ status: "notFound" as const, fieldErrors: null }, { status: 404 });
  }
  const { problem, fieldErrors } = snapshot.context;
  if ((problem === "invalidInput" || problem === "nameTaken") && fieldErrors) {
    return data(
      { status: "invalid" as const, fieldErrors },
      { status: problem === "nameTaken" ? 409 : 400 }
    );
  }
  return data({ status: "error" as const, fieldErrors: null }, { status: 500 });
}

export type SaveEmployerActionData = Awaited<ReturnType<typeof saveEmployerAction>>;
