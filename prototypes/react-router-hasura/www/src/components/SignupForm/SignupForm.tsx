import { Link } from "react-router";

import { CredentialsForm } from "../CredentialsForm/CredentialsForm";
import { minPasswordLength } from "~/features/auth/validation";

export interface SignupFormProps {
  readonly defaultEmail?: string;
  readonly error?: string;
  readonly emailError?: string;
  readonly passwordError?: string;
}

export function SignupForm({
  defaultEmail = undefined,
  error = undefined,
  emailError = undefined,
  passwordError = undefined,
}: SignupFormProps) {
  return (
    <CredentialsForm
      heading="Sign up"
      submitLabel="Create account"
      passwordAutoComplete="new-password"
      passwordDescription={`At least ${minPasswordLength} characters.`}
      defaultEmail={defaultEmail}
      error={error}
      emailError={emailError}
      passwordError={passwordError}
      footer={
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    />
  );
}
