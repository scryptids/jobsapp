import {
  data,
  // Outlet,
  // useLocation,
  // useOutlet,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import { type Positions, type PositionsQuery } from "src/graphql/_generated";
import { JobsTable } from "src/features/jobs/components/JobsTable/JobsTable";

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
import { jobCreationFormPath } from "~/app/routes";
import CustomLink from "~/components/CustomLink/CustomLink";

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

  return (
    <>
      <div>
        <h1>Jobs</h1>
        <CustomLink to={{ pathname: jobCreationFormPath }}>
          Add new job
        </CustomLink>

        <JobsTable jobsData={positions as Array<Positions>} />
      </div>
    </>
  );
}
