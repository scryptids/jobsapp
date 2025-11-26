import { useCallback } from "react";
import { Button, Menu, rem, useMantineTheme } from "@mantine/core";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { Positions } from "src/graphql/_generated";

export interface JobsTableRowMenuProps {
  readonly deleteJob: (jobId: number) => void;
  readonly job: Positions;
}

export function JobsTableRowMenu(props: JobsTableRowMenuProps) {
  const { job, deleteJob: deleteJobCallback } = props;

  const theme = useMantineTheme();
  const deleteJob = useCallback(() => deleteJobCallback(job.id), [job.id]);
  return (
    <Menu
      transitionProps={{ transition: "pop-top-right" }}
      position="top-end"
      width={220}
      withinPortal
    >
      <Menu.Target>
        <Button variant="transparent">
          <IconDots
            style={{ width: rem(18), height: rem(18) }}
            stroke={1.5}
            color="black"
          />
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={deleteJob}
          leftSection={
            <IconTrash
              style={{ width: rem(16), height: rem(16) }}
              color={theme.colors.red[6]}
              stroke={1.5}
            />
          }
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
