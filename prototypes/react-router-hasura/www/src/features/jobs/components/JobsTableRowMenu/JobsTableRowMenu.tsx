import { useCallback } from "react";
import { ActionIcon, Menu, rem } from "@mantine/core";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { type JobRow } from "../JobsTable/JobsTable";

export interface JobsTableRowMenuProps {
  readonly job: JobRow;
  readonly onDelete: (job: JobRow) => void;
  readonly deleteDisabled?: boolean;
}

export function JobsTableRowMenu({
  job,
  onDelete,
  deleteDisabled = false,
}: JobsTableRowMenuProps) {
  const handleDelete = useCallback(() => onDelete(job), [onDelete, job]);

  return (
    <Menu
      transitionProps={{ transition: "pop-top-right" }}
      position="bottom-end"
      width={220}
      withinPortal
    >
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Actions for ${job.title}`}
        >
          <IconDots style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          disabled={deleteDisabled}
          onClick={handleDelete}
          leftSection={
            <IconTrash style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
          }
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
