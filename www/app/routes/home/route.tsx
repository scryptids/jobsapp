import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PositionsQuery } from "~/graphql/_generated";

import {
  requireAuthSession,
  getSessionHasuraToken,
} from "~/sessions";
import { sdk } from "~/utils/api.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);

  const variables = { limit: 10 }
  const hasuraAccessToken = getSessionHasuraToken(session);
  try {
    const positions = await sdk.positions(variables, {
      authorization: `Bearer ${hasuraAccessToken}`,
    });
    return json(positions);
  } catch (e) {
    const emptyResp: Pick<PositionsQuery, 'positions'> = { positions: [] }
    return json(emptyResp)
  }
};

export default function Posts() {
  const { positions } = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>Jobs</h1>
      <ul>
        {positions.map((job) => (
          <li key={job.id}>
            <p>{job.title}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
