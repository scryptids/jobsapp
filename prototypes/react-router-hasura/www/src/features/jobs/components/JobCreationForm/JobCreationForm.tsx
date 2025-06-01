/**
 * Job creation form
 * @module
 */
import { Form, useFetcher } from "react-router";

import { mergeForm, useTransform } from "@tanstack/react-form";
import { initialFormState } from "@tanstack/react-form/remix";

import { useAppForm as useJobCreationAppForm } from "~/features/jobs/hooks/job-creation-form";
import {
  jobCreationFormOpts,
  JobCreationFormValues,
} from "~/features/jobs/components/JobCreationForm/shared-form";

import { ActionData } from "~/app/routes/jobs-submit";

import classes from "./JobCreationForm.css";

export type JobCreationFormProps = {
  actionData: ActionData;
  onSubmit: (value: JobCreationFormValues) => void;
};

export function JobCreationForm(props: JobCreationFormProps) {
  const { actionData } = props;

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
      props.onSubmit(value);
    },
  });

  // it might be necessary to switch to using a data router in order to use react-router.Form
  return (
    <div>
      <form
        action=""
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("onSubmit A");
          jobCreationForm.handleSubmit();
        }}
        method="post"
      >
        <jobCreationForm.AppField
          name="title"
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
