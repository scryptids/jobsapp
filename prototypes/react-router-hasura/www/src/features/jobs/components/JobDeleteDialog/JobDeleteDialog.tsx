/**
 * Confirmation before permanently deleting a job.
 * @module
 */

import { Button, Group, Modal, Text } from "@mantine/core";

export interface JobDeleteDialogProps {
  /** Title of the job to delete; the dialog is open while this is set. */
  readonly jobTitle: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function JobDeleteDialog({
  jobTitle,
  onCancel,
  onConfirm,
}: JobDeleteDialogProps) {
  return (
    <Modal
      opened={jobTitle !== null}
      onClose={onCancel}
      title="Delete job?"
      centered
    >
      <Text mb="lg">
        <strong>{jobTitle}</strong> will be permanently deleted. This
        can&apos;t be undone.
      </Text>
      <Group justify="flex-end">
        {/* Focus the safe choice first. */}
        <Button variant="default" onClick={onCancel} data-autofocus>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm}>
          Delete job
        </Button>
      </Group>
    </Modal>
  );
}
