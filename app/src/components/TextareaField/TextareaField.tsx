import { Textarea } from "@mantine/core";
import { useCallback } from "react";

import { useFieldContext } from "~/hooks/form-context";
import { useVisibleFieldError } from "~/components/TextField/TextField";

export interface TextareaFieldProps {
  readonly label: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly minRows?: number;
  readonly maxRows?: number;
}

/** Multi-line text field that grows with its content. */
export default function TextareaField({
  label,
  description = undefined,
  placeholder = undefined,
  minRows = 3,
  maxRows = 12,
}: TextareaFieldProps) {
  const field = useFieldContext<string>();
  const error = useVisibleFieldError();

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      field.handleChange(e.target.value);
    },
    [field]
  );

  return (
    <Textarea
      id={`field-${field.name}`}
      name={field.name}
      label={label}
      description={description}
      placeholder={placeholder}
      autosize
      minRows={minRows}
      maxRows={maxRows}
      value={field.state.value}
      onChange={onChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}
