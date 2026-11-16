/**
 * Job creation page at /dash/jobs/new.
 *
 * After a successful save the user chooses between adding another job and
 * returning to the page they came from (`?returnTo=`).
 * @module
 */

import { useCallback, useState } from "react";
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
import {
  validateJobForm,
  type JobCreationFormValues,
} from "src/features/jobs/components/JobCreationForm/validation";
import { createJob } from "src/features/jobs/createJob.server";
import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
import { sdk } from "~/api.server";
import { homePath, jobsListPath } from "~/app/routes";
import { returnToParam, safeReturnTo } from "~/utils/returnTo";

export const meta: MetaFunction = () => [{ title: "Add a job" }];

const formFields = [
  "title",
  "employerName",
  "postingUrl",
  "payRangeLower",
  "payRangeUpper",
] as const satisfies readonly (keyof JobCreationFormValues)[];

function backLabel(returnTo: string): string {
  const { pathname } = new URL(returnTo, "http://x");
  if (pathname === homePath) return "Back to dashboard";
  if (pathname === jobsListPath) return "Back to all jobs";
  return "Go back";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuthSession(request);
  const returnTo = safeReturnTo(
    new URL(request.url).searchParams.get(returnToParam),
    homePath
  );

  let employerOptions: string[] = [];
  try {
    const { employers } = await sdk.myEmployers(
      {},
      { authorization: `Bearer ${getSessionHasuraToken(session)}` }
    );
    employerOptions = employers.map((e) => e.name);
  } catch (e) {
    // Suggestions are optional; the form still works without them.
    console.error("Failed to load employers", e);
  }

  return data({ returnTo, employerOptions });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await requireAuthSession(request);
  const formData = await request.formData();
  const values = Object.fromEntries(
    formFields.map((name) => [name, String(formData.get(name) ?? "")])
  ) as JobCreationFormValues;

  // Mirrors the browser's checks; only reached if those were bypassed.
  const fieldErrors = validateJobForm(values);
  if (fieldErrors) {
    return data(
      { status: "invalid" as const, fieldErrors, job: null },
      { status: 400 }
    );
  }

  try {
    const job = await createJob(values, getSessionHasuraToken(session));
    return data({ status: "created" as const, fieldErrors: null, job });
  } catch (e) {
    console.error("Failed to create job", e);
    return data(
      { status: "error" as const, fieldErrors: null, job: null },
      { status: 500 }
    );
  }
}

export default function NewJob() {
  const { returnTo, employerOptions } = useLoaderData<typeof loader>();
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
      fetcher.submit(values, { method: "post" });
    },
    [fetcher]
  );

  const onAddAnother = useCallback(() => {
    setHandledResult(fetcher.data);
    setFormKey((k) => k + 1);
  }, [fetcher.data]);

  const label = backLabel(returnTo);

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
