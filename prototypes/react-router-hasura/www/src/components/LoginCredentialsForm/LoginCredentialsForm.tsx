import { Button, Container, TextInput } from "@mantine/core";
import { Form, Link } from "react-router";

export interface LoginCredentialsFormProps {
  readonly error?: string;
  readonly emailError?: string;
  readonly passwordError?: string;
}

export function LoginCredentialsForm(props: LoginCredentialsFormProps) {
  const {
    error = undefined,
    emailError = undefined,
    passwordError = undefined,
  } = props;
  return (
    <Container size="sm">
      <h2 id="login-header">Log in</h2>
      {error ? <div className="error">{error}</div> : null}
      <Form method="post">
        <div>
          <TextInput
            autoFocus
            error={emailError && <span id="email-error">{emailError}</span>}
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={emailError ? "email-error" : "login-header"}
            required
          />
        </div>

        <div>
          <TextInput
            id="password"
            name="password"
            type="password"
            label="Password"
            error={
              passwordError && <span id="password-error">{passwordError}</span>
            }
            autoComplete="current-password"
            aria-describedby="password-error"
            required
          />
        </div>

        <div>
          <Button type="submit">Sign in</Button>
        </div>
        <div className="text-sm text-slate-500">
          Don't have an account?{" "}
          <Link className="underline" to="/signup">
            Sign up
          </Link>
        </div>
      </Form>
    </Container>
  );
}
