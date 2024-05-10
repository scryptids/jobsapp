import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { sdk } from "~/utils/api.server";

export const loader = async () => {
  const positions = await sdk.positions({ limit: 10 });
  return json(positions);
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