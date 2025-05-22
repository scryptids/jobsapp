/**
 * Job creation form
 * @module
 */

import { Modal } from "@mantine/core";

import JobCreationForm from "../JobCreationForm/JobCreationForm";

export type JobCreationModalProps = {
  opened: boolean;
  close: () => void;
};

export function JobCreationModal(props: JobCreationModalProps) {
  return (
    <Modal opened={props.opened} onClose={props.close}>
      <JobCreationForm
        onSubmit={() => {
          // close();
        }}
      />
    </Modal>
  );
}

JobCreationModal.displayName = "JobCreationModal";

export default JobCreationModal;
