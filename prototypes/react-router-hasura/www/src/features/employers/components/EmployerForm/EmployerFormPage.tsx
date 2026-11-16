/**
 * Page body for adding or editing an employer: back link, problems from the
 * last save, and the form. Posts to the current route's action.
 * @module
 */

import { useCallback } from "react";
import { Alert } from "@mantine/core";
import { Link, useFetcher } from "react-router";

import { backLabel } from "~/app/navigation";
import { returnToParam } from "~/utils/returnTo";
import type { saveEmployerAction } from "../../saveEmployerRoute.server";
import type { EmployerFormValues } from "../../validation";
import EmployerForm from "./EmployerForm";

export interface EmployerFormPageProps {
  readonly heading: string;
  readonly returnTo: string;
  readonly submitLabel: string;
  readonly initialValues?: EmployerFormValues;
  /**
   * Return to `returnTo` after saving. When false the server's default
   * applies: the employer's own page.
   */
  readonly returnAfterSave?: boolean;
}

export function EmployerFormPage({
  heading,
  returnTo,
  submitLabel,
  initialValues = undefined,
  returnAfterSave = true,
}: EmployerFormPageProps) {
  const fetcher = useFetcher<typeof saveEmployerAction>();
  const result = fetcher.state === "idle" ? fetcher.data : undefined;

  const onSubmit = useCallback(
    (values: EmployerFormValues) => {
      // `type` is the event for the server-side save-employer machine.
      fetcher.submit(
        {
          ...values,
          type: "employer.submit",
          ...(returnAfterSave ? { [returnToParam]: returnTo } : {}),
        },
        { method: "post" }
      );
    },
    [fetcher, returnTo, returnAfterSave]
  );

  return (
    <div>
      <Link to={returnTo}>&larr; {backLabel(returnTo)}</Link>
      <h1>{heading}</h1>

      {result?.status === "error" ? (
        <Alert color="red" title="Couldn't save the employer" mb="md" role="alert">
          Something went wrong on our side. Your entries are still here; please try
          again.
        </Alert>
      ) : null}
      {result?.status === "notFound" ? (
        <Alert color="red" title="Employer not found" mb="md" role="alert">
          This employer no longer exists.
        </Alert>
      ) : null}
      {result?.status === "invalid" ? (
        <Alert color="red" title="Please fix these fields" mb="md" role="alert">
          {Object.values(result.fieldErrors).join(" ")}
        </Alert>
      ) : null}

      <EmployerForm
        initialValues={initialValues}
        submitLabel={submitLabel}
        submitting={fetcher.state !== "idle"}
        onSubmit={onSubmit}
      />
    </div>
  );
}
