/**
 * The user's employers at /dash/employers.
 * @module
 */

import { Button, Group, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import {
  data,
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { requireUserId } from "src/app/sessions";
import { employersRepo } from "~/db/repository.server";
import { employerCreationFormPath, employersListPath, homePath } from "~/app/routes";
import { EmployersTable } from "~/features/employers/components/EmployersTable/EmployersTable";
import { withReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction = () => [{ title: "Employers" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  return data({ employers: await employersRepo.listWithJobCount(userId) });
}

export default function EmployersIndex() {
  const { employers } = useLoaderData<typeof loader>();

  return (
    <div>
      <Link to={homePath}>&larr; Dashboard</Link>
      <Group justify="space-between" maw={720} my="md">
        <Title order={1}>Employers</Title>
        <Button
          component={Link}
          to={withReturnTo(employerCreationFormPath, employersListPath)}
          leftSection={<IconPlus size={16} />}
        >
          Add employer
        </Button>
      </Group>
      {employers.length > 0 ? (
        <EmployersTable employers={employers} />
      ) : (
        <Text c="dimmed">No employers yet. They&apos;re added with jobs, or here.</Text>
      )}
    </div>
  );
}
