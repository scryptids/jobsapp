import { TextInput } from "@mantine/core";
import { useStore } from "@tanstack/react-form-remix";
import { useCallback } from "react";
import { useFieldContext } from "~/hooks/form-context";

export default function TextField({ label }: { label: string }) {
  const field = useFieldContext<string>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    field.handleChange(e.target.value);
  }, []);

  return (
    <div>
      <TextInput
        label={label}
        value={field.state.value}
        name={field.name}
        onChange={onChange}
      />
      {errors.map((error: string) => (
        <div key={error} style={{ color: "red" }}>
          {error}
        </div>
      ))}
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em>{field.state.meta.errors.join(", ")}</em>
      ) : null}
      {field.state.meta.isValidating ? "Validating..." : null}
    </div>
  );
}
