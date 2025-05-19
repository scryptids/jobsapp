/**
 * Job creation form
 * @module
 */

import {
  useLoaderData,
  useFetcher,
  useLocation,
  useSubmit,
} from "react-router";
import { useForm, type AnyFieldApi } from "@tanstack/react-form";
import { Button } from "@mantine/core";
import classes from "./JobCreationForm.css";

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em>{field.state.meta.errors.join(", ")}</em>
      ) : null}
      {field.state.meta.isValidating ? "Validating..." : null}
    </>
  );
}

export type JobCreationFormProps = {
  onSubmit: () => void;
};

export function JobCreationForm(props: JobCreationFormProps) {
  const form = useForm({
    defaultValues: {
      title: "",
    },
    onSubmit: async ({ value }) => {
      props.onSubmit();
    },
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) =>
              !value ? "A title is required" : undefined,
          }}
          children={(field) => {
            return (
              <>
                <label htmlFor={field.name}>Title</label>
                <input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "..." : "Submit"}
            </Button>
          )}
        />
      </form>
    </div>
  );
}

JobCreationForm.displayName = "JobCreationForm";

export default JobCreationForm;
