/**
 * Job editing page at /dash/jobs/:jobId/edit. Saving returns to the page the
 * user came from (`?returnTo=`), or the job's page.
 * @module
 */

import { useCallback } from "react";
import { Alert } from "@mantine/core";
import {
  data,
  Link,
  redirect,
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import JobCreationForm from "src/features/jobs/components/JobCreationForm/JobCreationForm";
import type { JobCreationFormValues } from "src/features/jobs/components/JobCreationForm/validation";
import { requireUserId } from "src/app/sessions";
import { employersRepo, positionsRepo } from "~/db/repository.server";
import { jobDetailPath } from "~/app/routes";
import { backLabel } from "~/app/navigation";
import { payFormValue } from "~/features/jobs/format";
import { updateJobMachineFor } from "~/features/jobs/updateJobMachine.server";
import { formDataToEvent, runMachineRequest } from "~/utils/machineRequest.server";
import { parseId } from "~/utils/parseId";
import { returnToParam, safeReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `Edit ${loaderData.initialValues.title}` : "Edit job" },
];

const formFields = [
  "title",
  "employerName",
  "postingUrl",
  "payRangeLower",
  "payRangeUpper",
  "notes",
] as const satisfies readonly (keyof JobCreationFormValues)[];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const id = parseId(params.jobId);
  if (id === null) throw data(null, { status: 404 });

  const job = await positionsRepo.byId(userId, id);
  if (!job) throw data(null, { status: 404 });

  let employerOptions: string[] = [];
  try {
    employerOptions = (await employersRepo.list(userId)).map((e) => e.name);
  } catch (e) {
    // Suggestions are optional; the form still works without them.
    console.error("Failed to load employers", e);
  }

  const initialValues: JobCreationFormValues = {
    title: job.title,
    employerName: job.employer?.name ?? "",
    postingUrl: job.postingUrl ?? "",
    payRangeLower: payFormValue(job.payRangeLower),
    payRangeUpper: payFormValue(job.payRangeUpper),
    notes: job.notes ?? "",
  };
  const returnTo = safeReturnTo(
    new URL(request.url).searchParams.get(returnToParam),
    jobDetailPath(id)
  );

  return data({ jobId: id, returnTo, initialValues, employerOptions });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const event = formDataToEvent(await request.formData(), ["job.submit"] as const);
  if (!event) {
    return data({ status: "error" as const, fieldErrors: null }, { status: 400 });
  }

  const { snapshot } = await runMachineRequest({
    machine: updateJobMachineFor(userId),
    request,
    input: { jobId: params.jobId },
    event: {
      type: event.type,
      ...(Object.fromEntries(
        formFields.map((name) => [name, event[name] ?? ""])
      ) as JobCreationFormValues),
    },
  });

  if (snapshot.matches("updated") && snapshot.output?.job) {
    throw redirect(safeReturnTo(event[returnToParam], jobDetailPath(snapshot.output.job.id)));
  }
  if (snapshot.matches("notFound") || snapshot.matches("invalid")) {
    return data({ status: "notFound" as const, fieldErrors: null }, { status: 404 });
  }
  if (snapshot.context.problem === "invalidInput" && snapshot.context.fieldErrors) {
    // Mirrors the browser's checks; only reached if those were bypassed.
    return data(
      { status: "invalid" as const, fieldErrors: snapshot.context.fieldErrors },
      { status: 400 }
    );
  }
  return data({ status: "error" as const, fieldErrors: null }, { status: 500 });
}

export default function EditJob() {
  const { returnTo, initialValues, employerOptions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.state === "idle" ? fetcher.data : undefined;

  const onSubmit = useCallback(
    (values: JobCreationFormValues) => {
      // `type` is the event for the server-side update-job machine.
      fetcher.submit(
        { ...values, type: "job.submit", [returnToParam]: returnTo },
        { method: "post" }
      );
    },
    [fetcher, returnTo]
  );

  return (
    <div>
      <Link to={returnTo}>&larr; {backLabel(returnTo)}</Link>
      <h1>Edit job</h1>

      {result?.status === "error" ? (
        <Alert color="red" title="Couldn't save the job" mb="md" role="alert">
          Something went wrong on our side. Your changes are still here; please try
          again.
        </Alert>
      ) : null}
      {result?.status === "notFound" ? (
        <Alert color="red" title="Job not found" mb="md" role="alert">
          This job no longer exists.
        </Alert>
      ) : null}
      {result?.status === "invalid" ? (
        <Alert color="red" title="Please fix these fields" mb="md" role="alert">
          {Object.values(result.fieldErrors).join(" ")}
        </Alert>
      ) : null}

      <JobCreationForm
        initialValues={initialValues}
        employerOptions={employerOptions}
        submitLabel="Save changes"
        submitting={fetcher.state !== "idle"}
        onSubmit={onSubmit}
      />
    </div>
  );
}
