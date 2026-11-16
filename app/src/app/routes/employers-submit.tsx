/**
 * New employer page at /dash/employers/new.
 * @module
 */

import {
  data,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { requireAuthSession } from "src/app/sessions";
import { employersListPath } from "~/app/routes";
import { EmployerFormPage } from "~/features/employers/components/EmployerForm/EmployerFormPage";
import { saveEmployerAction } from "~/features/employers/saveEmployerRoute.server";
import { returnToParam, safeReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction = () => [{ title: "Add an employer" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuthSession(request);
  const returnTo = safeReturnTo(
    new URL(request.url).searchParams.get(returnToParam),
    employersListPath
  );
  return data({ returnTo });
}

export function action({ request }: ActionFunctionArgs) {
  return saveEmployerAction(request, null);
}

export default function NewEmployer() {
  const { returnTo } = useLoaderData<typeof loader>();
  // A new employer lands on its own page; `returnTo` only drives the back link.
  return (
    <EmployerFormPage
      heading="Add an employer"
      returnTo={returnTo}
      submitLabel="Save employer"
      returnAfterSave={false}
    />
  );
}
