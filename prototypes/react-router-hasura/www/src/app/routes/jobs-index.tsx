/**
 * Full, paginated jobs listing at /dash/jobs.
 * @module
 */

import { Group } from "@mantine/core";
import {
  data,
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { type Positions } from "src/graphql/_generated";
import { JobsTable } from "src/features/jobs/components/JobsTable/JobsTable";

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
import { homePath, jobCreationFormPath, jobsListPath } from "~/app/routes";

const pageSize = 25;

export const meta: MetaFunction = () => [{ title: "All jobs" }];

/**
 * Parse the 1-based `?page=` search param, falling back to page 1 for
 * missing or invalid values.
 */
function parsePage(url: URL): number {
  const page = Number(url.searchParams.get("page"));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);
  const hasuraAccessToken = getSessionHasuraToken(session);
  const page = parsePage(new URL(request.url));

  try {
    // Fetch one extra row to learn whether a next page exists without
    // needing aggregate (count) permissions.
    const { positions } = await sdk.positionsPage(
      { limit: pageSize + 1, offset: (page - 1) * pageSize },
      { authorization: `Bearer ${hasuraAccessToken}` }
    );
    return data({
      page,
      positions: positions.slice(0, pageSize),
      hasNextPage: positions.length > pageSize,
    });
  } catch (_) {
    return data({ page, positions: [], hasNextPage: false });
  }
}

export default function JobsIndex() {
  const { page, positions, hasNextPage } = useLoaderData<typeof loader>();

  return (
    <div>
      <Link to={homePath}>&larr; Dashboard</Link>
      <h1>All jobs</h1>
      <Link to={jobCreationFormPath}>Add new job</Link>

      {positions.length > 0 ? (
        <JobsTable jobsData={positions as Array<Positions>} />
      ) : (
        <p>{page > 1 ? "No jobs on this page." : "No jobs yet."}</p>
      )}

      <Group component="nav" aria-label="Jobs pagination" gap="md">
        {page > 1 ? (
          <Link to={`${jobsListPath}?page=${page - 1}`} rel="prev">
            Previous
          </Link>
        ) : null}
        <span>Page {page}</span>
        {hasNextPage ? (
          <Link to={`${jobsListPath}?page=${page + 1}`} rel="next">
            Next
          </Link>
        ) : null}
      </Group>
    </div>
  );
}
