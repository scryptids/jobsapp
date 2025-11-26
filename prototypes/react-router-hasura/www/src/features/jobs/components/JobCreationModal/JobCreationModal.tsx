/**
 * Job creation form
 * @module
 */

import { Modal } from "@mantine/core";

import JobCreationForm from "../JobCreationForm/JobCreationForm";
import { useCallback } from "react";

export type JobCreationModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
};

export function JobCreationModal(props: JobCreationModalProps) {
  const { onClose, opened } = props;
  const onSubmit = useCallback(() => {}, []);
  return (
    <Modal opened={opened} onClose={onClose}>
      <JobCreationForm onSubmit={onSubmit} />
    </Modal>
  );
}

JobCreationModal.displayName = "JobCreationModal";

export default JobCreationModal;
