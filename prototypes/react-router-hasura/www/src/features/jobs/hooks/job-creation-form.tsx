import { lazy } from "react";
import { Button } from "@mantine/core";
import { createFormHook } from "@tanstack/react-form";

import {
  fieldContext,
  formContext,
  useFormContext,
} from "~/hooks/form-context";

const TextField = lazy(() => import("~/components/TextField/TextField"));

function SubscribeButton({ label }: { label: string }) {
  const form = useFormContext();
  return (
    <form.Subscribe
      selector={(state) => [state.canSubmit, state.isSubmitting]}
      children={([canSubmit, isSubmitting]) => (
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "..." : label}
        </Button>
      )}
    />
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
});
