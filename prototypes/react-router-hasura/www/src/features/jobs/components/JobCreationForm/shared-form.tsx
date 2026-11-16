import { formOptions } from "@tanstack/react-form-remix";

import { type JobCreationFormValues } from "./validation";

export type { JobCreationFormValues } from "./validation";

const defaultValues: JobCreationFormValues = {
  title: "",
  employerName: "",
  postingUrl: "",
  payRangeLower: "",
  payRangeUpper: "",
};

export const jobCreationFormOpts = formOptions({
  defaultValues,
});
