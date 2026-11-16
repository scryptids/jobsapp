import { Autocomplete } from "@mantine/core";

import { useFieldContext } from "~/hooks/form-context";
import { useVisibleFieldError } from "~/components/TextField/TextField";

export interface AutocompleteFieldProps {
  readonly label: string;
  readonly options: readonly string[];
  readonly description?: string;
  readonly placeholder?: string;
}

/** Free-text input that also suggests existing values. */
export default function AutocompleteField({
  label,
  options,
  description = undefined,
  placeholder = undefined,
}: AutocompleteFieldProps) {
  const field = useFieldContext<string>();
  const error = useVisibleFieldError();

  return (
    <Autocomplete
      id={`job-${field.name}`}
      name={field.name}
      label={label}
      description={description}
      placeholder={placeholder}
      data={options as string[]}
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}
