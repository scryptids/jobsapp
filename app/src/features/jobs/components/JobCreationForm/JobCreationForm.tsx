/**
 * Job form, used both to add a job and to edit one.
 * @module
 */

import { useCallback, useMemo } from "react";
import { Group, SimpleGrid, Stack } from "@mantine/core";

import { useAppForm as useJobCreationAppForm } from "~/features/jobs/hooks/job-creation-form";
import {
  jobCreationFormOpts,
  type JobCreationFormValues,
} from "./shared-form";
import { validateJobForm } from "./validation";

export type JobCreationFormProps = {
  /** Names of the user's existing employers, offered as suggestions. */
  readonly employerOptions: readonly string[];
  /** Values to start from, e.g. the job being edited. */
  readonly initialValues?: Partial<JobCreationFormValues>;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly onSubmit: (value: JobCreationFormValues) => void;
};

function validate({ value }: { value: JobCreationFormValues }) {
  const fields = validateJobForm(value);
  return fields ? { fields } : undefined;
}

function JobCreationForm({
  employerOptions,
  initialValues = undefined,
  submitLabel = "Save job",
  submitting = false,
  onSubmit,
}: JobCreationFormProps) {
  const defaultValues = useMemo(
    () => ({ ...jobCreationFormOpts.defaultValues, ...initialValues }),
    [initialValues]
  );
  const form = useJobCreationAppForm({
    ...jobCreationFormOpts,
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
        <form.AppField name="title">
          {(field) => (
            <field.TextField
              label="Job title"
              placeholder="e.g. Senior Frontend Engineer"
              required
              autoFocus
            />
          )}
        </form.AppField>

        <form.AppField name="employerName">
          {(field) => (
            <field.AutocompleteField
              label="Employer"
              placeholder="e.g. Acme Corp"
              description="Pick one of yours or type a new name."
              options={employerOptions}
            />
          )}
        </form.AppField>

        <form.AppField name="postingUrl">
          {(field) => (
            <field.TextField
              label="Job posting link"
              placeholder="https://"
              type="url"
              inputMode="url"
            />
          )}
        </form.AppField>

        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <form.AppField name="payRangeLower">
            {(field) => (
              <field.TextField
                label="Minimum pay"
                placeholder="e.g. 90,000"
                inputMode="decimal"
              />
            )}
          </form.AppField>
          <form.AppField name="payRangeUpper">
            {(field) => (
              <field.TextField
                label="Maximum pay"
                placeholder="e.g. 120,000"
                inputMode="decimal"
              />
            )}
          </form.AppField>
        </SimpleGrid>

        <form.AppField name="notes">
          {(field) => (
            <field.TextareaField
              label="Notes"
              placeholder="Contacts, interview dates, impressions…"
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

JobCreationForm.displayName = "JobCreationForm";

export default JobCreationForm;
