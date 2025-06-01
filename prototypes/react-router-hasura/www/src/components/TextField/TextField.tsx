import { TextInput } from "@mantine/core";
import { useStore } from "@tanstack/react-form";
import { useFieldContext } from "~/hooks/form-context";

export default function TextField({ label }: { label: string }) {
  const field = useFieldContext<string>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <div>
      <TextInput
        label={label}
        value={field.state.value}
        name={field.name}
        onChange={(e) => field.handleChange(e.target.value)}
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
