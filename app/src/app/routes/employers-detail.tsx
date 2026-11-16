/**
 * One employer at /dash/employers/:employerId: its notes and all its jobs.
 * @module
 */

import { Anchor, Button, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import {
  data,
  Link,
  useLoaderData,
  useLocation,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { requireUserId } from "src/app/sessions";
import { employersRepo } from "~/db/repository.server";
import { employerEditPath, employersListPath, jobCreationFormPath } from "~/app/routes";
import { useEmployerDelete } from "~/features/employers/hooks/useEmployerDelete";
import { JobsTable } from "~/features/jobs/components/JobsTable/JobsTable";
import { parseId } from "~/utils/parseId";
import { returnToParam, withReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData?.employer.name ?? "Employer" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const id = parseId(params.employerId);
  if (id === null) throw data(null, { status: 404 });

  const employer = await employersRepo.byId(userId, id);
  if (!employer) throw data(null, { status: 404 });
  return data({ employer });
}

export default function EmployerDetail() {
  const { employer } = useLoaderData<typeof loader>();
  const location = useLocation();
  const here = location.pathname + location.search;
  const { requestDelete, deleting, alert, dialog } = useEmployerDelete({
    redirectTo: employersListPath,
  });
  const onDelete = useCallback(() => requestDelete(employer), [requestDelete, employer]);
  const hasJobs = employer.positions.length > 0;
  const addJobPath = `${jobCreationFormPath}?${new URLSearchParams({
    employer: employer.name,
    [returnToParam]: here,
  })}`;
  const editPath = withReturnTo(employerEditPath(employer.id), here);

  return (
    <Stack gap="md" maw={720}>
      <Link to={employersListPath}>&larr; Employers</Link>
      {alert}

      <Group justify="space-between" align="flex-start">
        <Title order={1}>{employer.name}</Title>
        <Group gap="xs">
          <Button
            component={Link}
            to={editPath}
            variant="default"
            leftSection={<IconPencil size={16} />}
          >
            Edit
          </Button>
          <Tooltip label="Delete or move its jobs first" disabled={!hasJobs}>
            {/* Wrapper keeps the tooltip working on a disabled button. */}
            <span>
              <Button
                color="red"
                variant="light"
                onClick={onDelete}
                disabled={hasJobs}
                loading={deleting}
                leftSection={<IconTrash size={16} />}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
        </Group>
      </Group>

      <section aria-labelledby="employer-notes">
        <Title order={2} size="h3" id="employer-notes">
          Notes
        </Title>
        {employer.notes ? (
          <Text style={{ whiteSpace: "pre-wrap" }}>{employer.notes}</Text>
        ) : (
          <Text c="dimmed">
            No notes yet.{" "}
            <Anchor component={Link} to={editPath}>
              Add some
            </Anchor>
          </Text>
        )}
      </section>

      <section aria-labelledby="employer-jobs">
        <Group justify="space-between" mb="xs">
          <Title order={2} size="h3" id="employer-jobs">
            Jobs
          </Title>
          <Button
            component={Link}
            to={addJobPath}
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
          >
            Add job
          </Button>
        </Group>
        {hasJobs ? (
          <JobsTable jobsData={employer.positions} hideEmployer />
        ) : (
          <Text c="dimmed">No jobs at {employer.name} yet.</Text>
        )}
      </section>

      {dialog}
    </Stack>
  );
}
