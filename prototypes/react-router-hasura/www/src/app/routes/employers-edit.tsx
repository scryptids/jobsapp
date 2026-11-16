/**
 * Employer editing page at /dash/employers/:employerId/edit.
 * @module
 */

import {
  data,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
import { employerDetailPath } from "~/app/routes";
import { EmployerFormPage } from "~/features/employers/components/EmployerForm/EmployerFormPage";
import { saveEmployerAction } from "~/features/employers/saveEmployerRoute.server";
import { authHeaders } from "~/features/jobs/createJob.server";
import { parseId } from "~/utils/parseId";
import { returnToParam, safeReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `Edit ${loaderData.initialValues.name}` : "Edit employer" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);
  const id = parseId(params.employerId);
  if (id === null) throw data(null, { status: 404 });

  const { employers_by_pk: employer } = await sdk.employerById(
    { id },
    authHeaders(getSessionHasuraToken(session)!)
  );
  if (!employer) throw data(null, { status: 404 });

  const returnTo = safeReturnTo(
    new URL(request.url).searchParams.get(returnToParam),
    employerDetailPath(id)
  );
  return data({
    returnTo,
    initialValues: { name: employer.name, notes: employer.notes ?? "" },
  });
}

export function action({ request, params }: ActionFunctionArgs) {
  return saveEmployerAction(request, params.employerId);
}

export default function EditEmployer() {
  const { returnTo, initialValues } = useLoaderData<typeof loader>();
  return (
    <EmployerFormPage
      heading="Edit employer"
      returnTo={returnTo}
      submitLabel="Save changes"
      initialValues={initialValues}
    />
  );
}
