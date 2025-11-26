/**
 * Job creation form
 * @module
 */
// import { Form, useFetcher } from "react-router";

import { mergeForm, useTransform } from "@tanstack/react-form";
import { initialFormState } from "@tanstack/react-form/remix";

import { useAppForm as useJobCreationAppForm } from "~/features/jobs/hooks/job-creation-form";
import {
  jobCreationFormOpts,
  JobCreationFormValues,
} from "~/features/jobs/components/JobCreationForm/shared-form";

import { ActionData } from "~/app/routes/jobs-submit";
import { useCallback } from "react";

// import classes from "./JobCreationForm.css";

export type JobCreationFormProps = {
  readonly actionData: ActionData;
  readonly onSubmit: (value: JobCreationFormValues) => void;
};

function JobCreationForm(props: JobCreationFormProps) {
  const { actionData, onSubmit: onSubmitCallback } = props;

  const formState = actionData ? { values: actionData } : initialFormState;
  const jobCreationForm = useJobCreationAppForm({
    ...jobCreationFormOpts,
    transform: useTransform(
      (baseForm) => mergeForm(baseForm, formState),
      [actionData]
    ),
    validators: {
      onChange: ({ value }) => {
        console.log(value);
        const errors = { fields: {} } as { fields: Record<string, string> };
        if (!value.title) {
          errors.fields.title = "A title is required";
        }
        return errors;
      },
    },
    onSubmit: ({ value }) => {
      console.log("onSubmit B");
      onSubmitCallback(value);
    },
  });

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("onSubmit A");
    jobCreationForm.handleSubmit();
  }, []);

  // it might be necessary to switch to using a data router in order to use react-router.Form
  return (
    <div>
      <form action="" onSubmit={onSubmit} method="post">
        <jobCreationForm.AppField
          name="title"
          // eslint-disable-next-line react/no-children-prop, react/jsx-no-bind
          children={(field) => <field.TextField label="Title" />}
        />
        <jobCreationForm.AppForm>
          <jobCreationForm.SubscribeButton label="Submit" />
        </jobCreationForm.AppForm>
      </form>
    </div>
  );
}

JobCreationForm.displayName = "JobCreationForm";

export default JobCreationForm;
