import { formOptions } from "@tanstack/react-form-remix";

import { type JobCreationFormValues } from "./validation";

export type { JobCreationFormValues } from "./validation";

export const defaultJobFormValues: JobCreationFormValues = {
  title: "",
  employerName: "",
  postingUrl: "",
  payRangeLower: "",
  payRangeUpper: "",
  notes: "",
};

export const jobCreationFormOpts = formOptions({
  defaultValues: defaultJobFormValues,
});
