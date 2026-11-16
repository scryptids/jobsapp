/**
 * Confirm-then-delete flow for employers.
 * @module
 */

import { employerDeletePath } from "~/app/routes";
import { useConfirmedDelete } from "~/hooks/useConfirmedDelete";

function failureMessage(reason: string | null, name: string): string {
  if (reason === "not-found") return `${name} no longer exists.`;
  if (reason === "has-jobs") return `${name} still has jobs. Delete or move them first.`;
  return `${name} wasn't deleted. Please try again.`;
}

export function useEmployerDelete({ redirectTo }: { readonly redirectTo?: string } = {}) {
  return useConfirmedDelete({
    kind: "employer",
    deletePath: employerDeletePath,
    redirectTo,
    failureMessage,
  });
}
