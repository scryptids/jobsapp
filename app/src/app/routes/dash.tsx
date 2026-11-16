import {
  data,
  // Outlet,
  // useLocation,
  // useOutlet,
  useLoaderData,
  useLocation,
  type LoaderFunctionArgs,
} from "react-router";

import { JobsTable } from "src/features/jobs/components/JobsTable/JobsTable";

import { requireUserId } from "src/app/sessions";
import { positionsRepo, type JobRow } from "~/db/repository.server";
import { jobCreationFormPath, jobsListPath } from "~/app/routes";
import CustomLink from "~/components/CustomLink/CustomLink";
import { withReturnTo } from "~/utils/returnTo";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  try {
    return data({ positions: await positionsRepo.list(userId, { limit: 10 }) });
  } catch (e) {
    console.error("Failed to load jobs", e);
    return data({ positions: [] as JobRow[] });
  }
}

export default function Dash() {
  const { positions } = useLoaderData<typeof loader>();
  const location = useLocation();

  return (
    <>
      <div>
        <h1>Jobs</h1>
        <CustomLink
          to={withReturnTo(
            jobCreationFormPath,
            location.pathname + location.search
          )}
        >
          Add new job
        </CustomLink>

        <JobsTable jobsData={positions} />
        <CustomLink to={jobsListPath}>View all</CustomLink>
      </div>
    </>
  );
}
