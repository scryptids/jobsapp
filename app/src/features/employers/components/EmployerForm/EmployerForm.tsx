/**
 * Employer form, used both to add an employer and to edit one.
 * @module
 */

import { useCallback, useMemo } from "react";
import { Group, Stack } from "@mantine/core";

import { useAppForm } from "~/features/jobs/hooks/job-creation-form";
import {
  defaultEmployerFormValues,
  validateEmployerForm,
  type EmployerFormValues,
} from "../../validation";

export type EmployerFormProps = {
  readonly initialValues?: Partial<EmployerFormValues>;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly onSubmit: (value: EmployerFormValues) => void;
};

function validate({ value }: { value: EmployerFormValues }) {
  const fields = validateEmployerForm(value);
  return fields ? { fields } : undefined;
}

export default function EmployerForm({
  initialValues = undefined,
  submitLabel = "Save employer",
  submitting = false,
  onSubmit,
}: EmployerFormProps) {
  const defaultValues = useMemo(
    () => ({ ...defaultEmployerFormValues, ...initialValues }),
    [initialValues]
  );
  const form = useAppForm({
    defaultValues,
    validators: { onChange: validate, onSubmit: validate },
    onSubmit: ({ value }) => onSubmit(value),
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <form method="post" noValidate onSubmit={handleSubmit}>
      <Stack gap="md" maw={560}>
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Name"
              placeholder="e.g. Acme Corp"
              required
              autoFocus
            />
          )}
        </form.AppField>

        <form.AppField name="notes">
          {(field) => (
            <field.TextareaField
              label="Notes"
              placeholder="Culture, contacts, how you heard about them…"
            />
          )}
        </form.AppField>

        <Group>
          <form.AppForm>
            <form.SubscribeButton label={submitLabel} busy={submitting} />
          </form.AppForm>
        </Group>
      </Stack>
    </form>
  );
}
