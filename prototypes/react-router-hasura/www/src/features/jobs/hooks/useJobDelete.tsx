/**
 * Confirm-then-delete flow for jobs, shared by every place that shows them.
 * @module
 */

import { useCallback } from "react";

import { jobDeletePath } from "~/app/routes";
import { useConfirmedDelete } from "~/hooks/useConfirmedDelete";

export type DeletableJob = { readonly id: number; readonly title: string };

function failureMessage(reason: string | null, title: string): string {
  return reason === "not-found"
    ? `${title} no longer exists.`
    : `${title} wasn't deleted. Please try again.`;
}

export function useJobDelete({ redirectTo }: { readonly redirectTo?: string } = {}) {
  const { requestDelete, ...rest } = useConfirmedDelete({
    kind: "job",
    deletePath: jobDeletePath,
    redirectTo,
    failureMessage,
  });
  const requestJobDelete = useCallback(
    (job: DeletableJob) => requestDelete({ id: job.id, name: job.title }),
    [requestDelete]
  );
  return { requestDelete: requestJobDelete, ...rest };
}
