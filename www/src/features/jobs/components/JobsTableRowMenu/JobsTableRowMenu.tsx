import { Button, Menu, rem, useMantineTheme } from "@mantine/core";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { Positions } from "src/graphql/_generated";

export interface JobsTableRowMenuProps {
  job: Positions;
  deleteJob: (jobId: number) => void;
}

export function JobsTableRowMenu(props: JobsTableRowMenuProps) {
  const theme = useMantineTheme();
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
          onClick={() => props.deleteJob(props.job.id)}
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
