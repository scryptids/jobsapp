/**
 * Action-only route: POST /dash/jobs/:jobId/delete removes one of the
 * signed-in user's jobs. Submitted by the jobs table's row menu.
 * @module
 */

import { data, type ActionFunctionArgs } from "react-router";

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await requireAuthSession(request);

  const jobId = Number(params.jobId);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return data(
      { ok: false as const, reason: "invalid" as const },
      { status: 400 }
    );
  }

  try {
    const { delete_positions_by_pk } = await sdk.deletePosition(
      { id: jobId },
      { authorization: `Bearer ${getSessionHasuraToken(session)}` }
    );
    if (!delete_positions_by_pk) {
      // Missing, or owned by someone else; don't reveal which.
      return data(
        { ok: false as const, reason: "not-found" as const },
        { status: 404 }
      );
    }
    return data({ ok: true as const, reason: null });
  } catch (e) {
    console.error("Failed to delete job", e);
    return data(
      { ok: false as const, reason: "error" as const },
      { status: 500 }
    );
  }
}
