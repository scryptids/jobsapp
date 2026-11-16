/**
 * Confirm-then-delete flow: a confirmation dialog, a fetcher POST to an
 * action-only delete route, and an error alert if it failed.
 * @module
 */

import { useCallback, useState } from "react";
import { Alert } from "@mantine/core";
import { useFetcher } from "react-router";

import { ConfirmDeleteDialog } from "~/components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import { returnToParam } from "~/utils/returnTo";

export type DeletableItem = { readonly id: number; readonly name: string };

/** What delete routes respond with when they don't redirect. */
export type DeleteResult = { ok: boolean; reason: string | null };

export interface UseConfirmedDeleteOptions {
  /** What's being deleted, e.g. "job". */
  readonly kind: string;
  readonly deletePath: (id: number) => string;
  /** Where to go after a successful delete; stays on the page when unset. */
  readonly redirectTo?: string;
  /** Alert text for a failed delete. */
  readonly failureMessage: (reason: string | null, name: string) => string;
}

export function useConfirmedDelete({
  kind,
  deletePath,
  redirectTo,
  failureMessage,
}: UseConfirmedDeleteOptions) {
  const fetcher = useFetcher<DeleteResult>();
  // Item awaiting confirmation in the dialog.
  const [confirming, setConfirming] = useState<DeletableItem | null>(null);
  // Last item submitted for deletion, for the error message.
  const [lastDeleted, setLastDeleted] = useState<DeletableItem | null>(null);

  const deleting = fetcher.state !== "idle";
  const deletingId = deleting ? lastDeleted?.id : undefined;
  const failed = !deleting && fetcher.data?.ok === false && lastDeleted !== null;

  const confirm = useCallback(() => {
    if (!confirming) return;
    setLastDeleted(confirming);
    fetcher.submit(redirectTo ? { [returnToParam]: redirectTo } : null, {
      method: "post",
      action: deletePath(confirming.id),
    });
    setConfirming(null);
  }, [confirming, fetcher, redirectTo, deletePath]);

  const cancel = useCallback(() => setConfirming(null), []);

  const alert = failed ? (
    <Alert color="red" title={`Couldn't delete ${kind}`} mb="md" role="alert">
      {failureMessage(fetcher.data?.reason ?? null, lastDeleted.name)}
    </Alert>
  ) : null;

  const dialog = (
    <ConfirmDeleteDialog
      kind={kind}
      itemName={confirming?.name ?? null}
      onCancel={cancel}
      onConfirm={confirm}
    />
  );

  return { requestDelete: setConfirming, deleting, deletingId, alert, dialog };
}
