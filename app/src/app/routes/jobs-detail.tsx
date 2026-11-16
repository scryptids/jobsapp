/**
 * One job at /dash/jobs/:jobId: its details and notes, with edit and delete.
 * @module
 */

import { Anchor, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
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
import { positionsRepo } from "~/db/repository.server";
import { employerDetailPath, jobEditPath, jobsListPath } from "~/app/routes";
import { formatPayRange } from "~/features/jobs/format";
import { useJobDelete } from "~/features/jobs/hooks/useJobDelete";
import { parseId } from "~/utils/parseId";
import { withReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData?.job.title ?? "Job" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const id = parseId(params.jobId);
  if (id === null) throw data(null, { status: 404 });

  const job = await positionsRepo.byId(userId, id);
  if (!job) throw data(null, { status: 404 });
  return data({ job });
}

export default function JobDetail() {
  const { job } = useLoaderData<typeof loader>();
  const location = useLocation();
  const here = location.pathname + location.search;
  const { requestDelete, deleting, alert, dialog } = useJobDelete({
    redirectTo: jobsListPath,
  });
  const onDelete = useCallback(() => requestDelete(job), [requestDelete, job]);
  const pay = formatPayRange(job.payRangeLower, job.payRangeUpper);

  return (
    <Stack gap="md" maw={720}>
      <Link to={jobsListPath}>&larr; All jobs</Link>
      {alert}

      <Group justify="space-between" align="flex-start">
        <Title order={1}>{job.title}</Title>
        <Group gap="xs">
          <Button
            component={Link}
            to={withReturnTo(jobEditPath(job.id), here)}
            variant="default"
            leftSection={<IconPencil size={16} />}
          >
            Edit
          </Button>
          <Button
            color="red"
            variant="light"
            onClick={onDelete}
            loading={deleting}
            leftSection={<IconTrash size={16} />}
          >
            Delete
          </Button>
        </Group>
      </Group>

      <dl>
        <dt>Employer</dt>
        <dd>
          {job.employer ? (
            <Anchor component={Link} to={employerDetailPath(job.employer.id)}>
              {job.employer.name}
            </Anchor>
          ) : (
            <Text c="dimmed" span>
              None
            </Text>
          )}
        </dd>
        <dt>Posting</dt>
        <dd>
          {job.postingUrl ? (
            <Anchor href={job.postingUrl} target="_blank" rel="noreferrer">
              {job.postingUrl}
            </Anchor>
          ) : (
            <Text c="dimmed" span>
              None
            </Text>
          )}
        </dd>
        <dt>Pay</dt>
        <dd>
          {pay ?? (
            <Text c="dimmed" span>
              Not listed
            </Text>
          )}
        </dd>
      </dl>

      <section aria-labelledby="job-notes">
        <Title order={2} size="h3" id="job-notes">
          Notes
        </Title>
        {job.notes ? (
          <Text style={{ whiteSpace: "pre-wrap" }}>{job.notes}</Text>
        ) : (
          <Text c="dimmed">
            No notes yet.{" "}
            <Anchor component={Link} to={withReturnTo(jobEditPath(job.id), here)}>
              Add some
            </Anchor>
          </Text>
        )}
      </section>

      {dialog}
    </Stack>
  );
}
