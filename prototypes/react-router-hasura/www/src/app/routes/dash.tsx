import {
  data,
  // Outlet,
  // useLocation,
  // useOutlet,
  useLoaderData,
  useLocation,
  type LoaderFunctionArgs,
} from "react-router";

import { type PositionsQuery } from "src/graphql/_generated";
import { JobsTable } from "src/features/jobs/components/JobsTable/JobsTable";

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
import { jobCreationFormPath, jobsListPath } from "~/app/routes";
import CustomLink from "~/components/CustomLink/CustomLink";
import { withReturnTo } from "~/utils/returnTo";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);
  const variables = { limit: 10 };
  const hasuraAccessToken = getSessionHasuraToken(session);
  try {
    const positions = await sdk.positions(variables, {
      authorization: `Bearer ${hasuraAccessToken}`,
    });
    return data(positions);
  } catch (_) {
    const emptyResp: Pick<PositionsQuery, "positions"> = { positions: [] };
    return data(emptyResp);
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
