/**
 * Confirmation before permanently deleting something.
 * @module
 */

import { Button, Group, Modal, Text } from "@mantine/core";

export interface ConfirmDeleteDialogProps {
  /** What's being deleted, e.g. "job"; used in the title and button. */
  readonly kind: string;
  /** Name of the item to delete; the dialog is open while this is set. */
  readonly itemName: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  kind,
  itemName,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Modal opened={itemName !== null} onClose={onCancel} title={`Delete ${kind}?`} centered>
      <Text mb="lg">
        <strong>{itemName}</strong> will be permanently deleted. This can&apos;t be
        undone.
      </Text>
      <Group justify="flex-end">
        {/* Focus the safe choice first. */}
        <Button variant="default" onClick={onCancel} data-autofocus>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm}>
          Delete {kind}
        </Button>
      </Group>
    </Modal>
  );
}
