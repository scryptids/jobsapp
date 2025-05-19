import {
  data,
  Outlet,
  useLocation,
  useOutlet,
  type LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useLinkClickHandler } from "react-router";
import { useDisclosure } from "@mantine/hooks";
import { Button } from "@mantine/core";

import { type Positions, type PositionsQuery } from "src/graphql/_generated";
import { JobsTable, JobCreationForm } from "src/features/jobs/components";

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
// import { jobCreationModalPath } from "~/app/routes";
import JobCreationModal from "~/features/jobs/components/JobCreationModal/JobCreationModal";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);
  const variables = { limit: 10 };
  const hasuraAccessToken = getSessionHasuraToken(session);
  try {
    const positions = await sdk.positions(variables, {
      authorization: `Bearer ${hasuraAccessToken}`,
    });
    return data(positions);
  } catch (e) {
    const emptyResp: Pick<PositionsQuery, "positions"> = { positions: [] };
    return data(emptyResp);
  }
}

export default function Posts() {
  const { positions } = useLoaderData<typeof loader>();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  // const handleJobCreationLinkClick = useLinkClickHandler(jobCreationModalPath);

  return (
    <>
      <JobCreationModal opened={modalOpened} close={closeModal} />
      <div>
        <h1>Jobs</h1>
        <Button onClick={openModal}>Add new job</Button>
        {/* <Button component="a" onClick={handleJobCreationLinkClick}>
          Add new job
        </Button> */}
        <JobsTable jobsData={positions as Array<Positions>} />
        <Outlet />
      </div>
    </>
  );
}
