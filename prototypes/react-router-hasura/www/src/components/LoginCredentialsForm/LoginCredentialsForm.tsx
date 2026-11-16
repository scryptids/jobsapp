import { Link } from "react-router";

import { CredentialsForm } from "../CredentialsForm/CredentialsForm";

export interface LoginCredentialsFormProps {
  readonly defaultEmail?: string;
  readonly error?: string;
  readonly emailError?: string;
  readonly passwordError?: string;
}

export function LoginCredentialsForm({
  defaultEmail = undefined,
  error = undefined,
  emailError = undefined,
  passwordError = undefined,
}: LoginCredentialsFormProps) {
  return (
    <CredentialsForm
      heading="Log in"
      submitLabel="Log in"
      passwordAutoComplete="current-password"
      defaultEmail={defaultEmail}
      error={error}
      emailError={emailError}
      passwordError={passwordError}
      footer={
        <p>
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      }
    />
  );
}
