/**
 * Email + password form shared by the log-in and sign-up pages.
 * @module
 */

import { Button, Container, TextInput } from "@mantine/core";
import { Form, useNavigation } from "react-router";

export interface CredentialsFormProps {
  readonly heading: string;
  readonly submitLabel: string;
  readonly passwordAutoComplete: "current-password" | "new-password";
  readonly passwordDescription?: string;
  readonly defaultEmail?: string;
  readonly error?: string;
  readonly emailError?: string;
  readonly passwordError?: string;
  readonly footer?: React.ReactNode;
}

export function CredentialsForm({
  heading,
  submitLabel,
  passwordAutoComplete,
  passwordDescription = undefined,
  defaultEmail = undefined,
  error = undefined,
  emailError = undefined,
  passwordError = undefined,
  footer = undefined,
}: CredentialsFormProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <Container size="sm">
      <h2 id="credentials-header">{heading}</h2>
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}
      <Form method="post">
        <TextInput
          autoFocus
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          error={emailError}
          required
        />

        <TextInput
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          description={passwordDescription}
          error={passwordError}
          required
        />

        <Button type="submit" mt="md" loading={submitting}>
          {submitLabel}
        </Button>
      </Form>
      {footer}
    </Container>
  );
}
