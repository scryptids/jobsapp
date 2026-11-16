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

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
import { employerCreationFormPath, employersListPath, homePath } from "~/app/routes";
import { EmployersTable } from "~/features/employers/components/EmployersTable/EmployersTable";
import { authHeaders } from "~/features/jobs/createJob.server";
import { withReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction = () => [{ title: "Employers" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);
  const { employers } = await sdk.myEmployersWithJobCount(
    {},
    authHeaders(getSessionHasuraToken(session)!)
  );
  return data({
    employers: employers.map((e) => ({
      id: e.id,
      name: e.name,
      jobCount: e.positions_aggregate.aggregate?.count ?? 0,
    })),
  });
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
