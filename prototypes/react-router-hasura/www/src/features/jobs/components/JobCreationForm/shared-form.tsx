import { formOptions } from "@tanstack/react-form/remix";

export type JobCreationFormValues = {
  title: string;
};

const defaultValues: JobCreationFormValues = {
  title: "",
};

export const jobCreationFormOpts = formOptions({
  defaultValues,
});
