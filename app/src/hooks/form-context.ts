import { createFormHookContexts } from "@tanstack/react-form-remix";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();
