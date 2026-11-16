/**
 * Job creation page at /dash/jobs/new.
 *
 * After a successful save the user chooses between adding another job and
 * returning to the page they came from (`?returnTo=`).
 * @module
 */

import { useCallback, useMemo, useState } from "react";
import { Alert } from "@mantine/core";
import {
  data,
  Link,
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import JobCreationForm from "src/features/jobs/components/JobCreationForm/JobCreationForm";
import { JobSavedPrompt } from "src/features/jobs/components/JobSavedPrompt/JobSavedPrompt";
import type { JobCreationFormValues } from "src/features/jobs/components/JobCreationForm/validation";
import { createJobMachineFor } from "src/features/jobs/createJobMachine.server";
import { requireUserId } from "src/app/sessions";
import { employersRepo } from "~/db/repository.server";
import { homePath } from "~/app/routes";
import { backLabel } from "~/app/navigation";
import { formDataToEvent, runMachineRequest } from "~/utils/machineRequest.server";
import { returnToParam, safeReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction = () => [{ title: "Add a job" }];

const formFields = [
  "title",
  "employerName",
  "postingUrl",
  "payRangeLower",
  "payRangeUpper",
  "notes",
] as const satisfies readonly (keyof JobCreationFormValues)[];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const returnTo = safeReturnTo(
    new URL(request.url).searchParams.get(returnToParam),
    homePath
  );

  let employerOptions: string[] = [];
  try {
    employerOptions = (await employersRepo.list(userId)).map((e) => e.name);
  } catch (e) {
    // Suggestions are optional; the form still works without them.
    console.error("Failed to load employers", e);
  }

  // `?employer=` prefills the employer, e.g. from an employer's page.
  const employerName = new URL(request.url).searchParams.get("employer") ?? "";

  return data({ returnTo, employerOptions, employerName });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const event = formDataToEvent(await request.formData(), ["job.submit"] as const);
  if (!event) {
    return data(
      { status: "error" as const, fieldErrors: null, job: null },
      { status: 400 }
    );
  }

  const { snapshot } = await runMachineRequest({
    machine: createJobMachineFor(userId),
    request,
    event: {
      type: event.type,
      ...(Object.fromEntries(
        formFields.map((name) => [name, event[name] ?? ""])
      ) as JobCreationFormValues),
    },
  });

  if (snapshot.matches("created") && snapshot.output?.job) {
    return data({ status: "created" as const, fieldErrors: null, job: snapshot.output.job });
  }
  if (snapshot.context.problem === "invalidInput" && snapshot.context.fieldErrors) {
    // Mirrors the browser's checks; only reached if those were bypassed.
    return data(
      { status: "invalid" as const, fieldErrors: snapshot.context.fieldErrors, job: null },
      { status: 400 }
    );
  }
  return data(
    { status: "error" as const, fieldErrors: null, job: null },
    { status: 500 }
  );
}

export default function NewJob() {
  const { returnTo, employerOptions, employerName } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  // Remounting the form (new key) clears it for the next entry.
  const [formKey, setFormKey] = useState(0);
  // Which response the user already answered the prompt for.
  const [handledResult, setHandledResult] = useState<typeof fetcher.data>();

  const result = fetcher.data === handledResult ? undefined : fetcher.data;
  const savedTitle =
    fetcher.state === "idle" && result?.status === "created"
      ? result.job.title
      : null;

  const onSubmit = useCallback(
    (values: JobCreationFormValues) => {
      // `type` is the event for the server-side create-job machine.
      fetcher.submit({ ...values, type: "job.submit" }, { method: "post" });
    },
    [fetcher]
  );

  const onAddAnother = useCallback(() => {
    setHandledResult(fetcher.data);
    setFormKey((k) => k + 1);
  }, [fetcher.data]);

  const label = backLabel(returnTo);
  const initialValues = useMemo(
    () => (employerName ? { employerName } : undefined),
    [employerName]
  );

  return (
    <div>
      <Link to={returnTo}>&larr; {label}</Link>
      <h1>Add a job</h1>

      {result?.status === "error" ? (
        <Alert color="red" title="Couldn't save the job" mb="md" role="alert">
          Something went wrong on our side. Your entries are still here; please
          try again.
        </Alert>
      ) : null}
      {result?.status === "invalid" ? (
        <Alert color="red" title="Please fix these fields" mb="md" role="alert">
          {Object.values(result.fieldErrors).join(" ")}
        </Alert>
      ) : null}

      <JobCreationForm
        key={formKey}
        initialValues={initialValues}
        employerOptions={employerOptions}
        submitting={fetcher.state !== "idle"}
        onSubmit={onSubmit}
      />

      <JobSavedPrompt
        savedTitle={savedTitle}
        returnTo={returnTo}
        returnLabel={label}
        onAddAnother={onAddAnother}
      />
    </div>
  );
}
