import { TextInput } from "@mantine/core";
import { useStore } from "@tanstack/react-form-remix";
import { useCallback } from "react";

import { useFieldContext } from "~/hooks/form-context";

export interface TextFieldProps {
  readonly label: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly type?: "text" | "url";
  readonly inputMode?: "text" | "decimal" | "url";
  readonly autoFocus?: boolean;
}

/**
 * Show a field's first error once the user has left the field or tried to
 * submit, so errors don't appear while someone is still typing their first
 * characters.
 */
export function useVisibleFieldError(): string | undefined {
  const field = useFieldContext<string>();
  const submissionAttempts = useStore(
    field.form.store,
    (state) => state.submissionAttempts
  );
  const { errors, isBlurred } = field.state.meta;
  if (!isBlurred && submissionAttempts === 0) return undefined;
  const [first] = errors;
  return typeof first === "string" ? first : undefined;
}

export default function TextField({
  label,
  description = undefined,
  placeholder = undefined,
  required = false,
  type = "text",
  inputMode = undefined,
  autoFocus = false,
}: TextFieldProps) {
  const field = useFieldContext<string>();
  const error = useVisibleFieldError();

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      field.handleChange(e.target.value);
    },
    [field]
  );

  return (
    <TextInput
      id={`job-${field.name}`}
      name={field.name}
      label={label}
      description={description}
      placeholder={placeholder}
      withAsterisk={required}
      type={type}
      inputMode={inputMode}
      autoFocus={autoFocus}
      value={field.state.value}
      onChange={onChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}
