/**
 * Shown after a job is saved: add another, or return to where the user
 * started.
 * @module
 */

import { Button, Group, Modal, Text } from "@mantine/core";
import { Link } from "react-router";

export interface JobSavedPromptProps {
  /** Title of the job just saved; the prompt is open while this is set. */
  readonly savedTitle: string | null;
  readonly returnTo: string;
  readonly returnLabel: string;
  readonly onAddAnother: () => void;
}

export function JobSavedPrompt({
  savedTitle,
  returnTo,
  returnLabel,
  onAddAnother,
}: JobSavedPromptProps) {
  return (
    <Modal
      opened={savedTitle !== null}
      onClose={onAddAnother}
      title="Job saved"
      centered
      // Make the user pick one of the two choices explicitly.
      closeOnClickOutside={false}
      withCloseButton={false}
    >
      <Text mb="lg">
        <strong>{savedTitle}</strong> was added to your jobs. Would you like to
        add another?
      </Text>
      <Group justify="flex-end">
        <Button component={Link} to={returnTo} variant="default">
          {returnLabel}
        </Button>
        <Button onClick={onAddAnother} data-autofocus>
          Add another job
        </Button>
      </Group>
    </Modal>
  );
}
