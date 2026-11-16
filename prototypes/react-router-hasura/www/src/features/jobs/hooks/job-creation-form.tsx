import { Button } from "@mantine/core";
import { createFormHook } from "@tanstack/react-form-remix";

import {
  fieldContext,
  formContext,
  useFormContext,
} from "~/hooks/form-context";
import TextField from "~/components/TextField/TextField";
import AutocompleteField from "~/components/AutocompleteField/AutocompleteField";
import TextareaField from "~/components/TextareaField/TextareaField";

function SubscribeButton({
  label,
  busy = false,
}: {
  readonly label: string;
  readonly busy?: boolean;
}) {
  const form = useFormContext();
  return (
    <form.Subscribe
      // eslint-disable-next-line react/jsx-no-bind
      selector={(state) => state.isSubmitting}
      // eslint-disable-next-line react/no-children-prop, react/jsx-no-bind
      children={(isSubmitting) => (
        <Button type="submit" loading={busy || isSubmitting}>
          {label}
        </Button>
      )}
    />
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    AutocompleteField,
    TextareaField,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
});
