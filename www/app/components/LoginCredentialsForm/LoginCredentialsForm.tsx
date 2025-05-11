import { Button, Container, TextInput } from "@mantine/core";
import { Form, Link } from "react-router";

export interface LoginCredentialsFormProps {
  error?: string;
  emailError?: string;
  passwordError?: string;
}

export function LoginCredentialsForm(props: LoginCredentialsFormProps) {
  return (
    <Container size="sm">
      <h2 id="login-header">
        Log in
      </h2>
      {props.error ? <div className="error">{props.error}</div> : null}
      <Form method="post">
        <div>
          <TextInput
            autoFocus
            error={props.emailError && (
              <span id="email-error">
                {props.emailError}
              </span>
            )}
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={
              props.emailError ? "email-error" : "login-header"
            }
            required
          />
        </div>

        <div>
          <TextInput
            id="password"
            name="password"
            type="password"
            label="Password"
            error={props.passwordError && (
              <span id="password-error">
                {props.passwordError}
              </span>
            )}
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
    </Container >
  )
}