import { useCallback } from "react";
import { ActionIcon, Menu, rem } from "@mantine/core";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { Link, useLocation } from "react-router";

import { employerEditPath } from "~/app/routes";
import type { DeletableItem } from "~/hooks/useConfirmedDelete";
import { withReturnTo } from "~/utils/returnTo";
import type { EmployerRow } from "../EmployersTable/EmployersTable";

const iconStyle = { width: rem(16), height: rem(16) };

export interface EmployerRowMenuProps {
  readonly employer: EmployerRow;
  readonly onDelete: (employer: DeletableItem) => void;
  readonly deleteDisabled: boolean;
}

export function EmployerRowMenu({ employer, onDelete, deleteDisabled }: EmployerRowMenuProps) {
  const location = useLocation();
  const handleDelete = useCallback(() => onDelete(employer), [onDelete, employer]);
  const hasJobs = employer.jobCount > 0;

  return (
    <Menu position="bottom-end" width={240} withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${employer.name}`}>
          <IconDots style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          to={withReturnTo(employerEditPath(employer.id), location.pathname + location.search)}
          leftSection={<IconPencil style={iconStyle} stroke={1.5} />}
        >
          Edit
        </Menu.Item>
        <Menu.Item
          color="red"
          disabled={deleteDisabled || hasJobs}
          onClick={handleDelete}
          leftSection={<IconTrash style={iconStyle} stroke={1.5} />}
        >
          {hasJobs ? "Delete (remove its jobs first)" : "Delete"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
