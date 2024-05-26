import { json, type ActionFunctionArgs, redirect, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Button, TextInput, Container } from "@mantine/core";

import { sessionStorage } from "~/sessions";
import { validate } from "./validate";
import { createAccount } from "./queries";
import { generateHasuraJWT } from "~/auth/hasura";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  if (session.has("userId")) {
    return redirect("/home");
  }

  const data = { error: session.get("error") };

  return json(data, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    }
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const errors = await validate(email, password);
  if (errors) {
    return json({ ok: false, errors }, 400);
  }

  let user = await createAccount(email, password);
  session.set("userId", user.id);

  const hasuraAccessToken = generateHasuraJWT({
    defaultRole: "user",
    allowedRoles: ["user"],
    otherClaims: {
      "X-Hasura-User-Id": user.id.toString(),
    },
  })
  session.set("hasuraAccessToken", hasuraAccessToken)

  // Login succeeded, send them to the home page.
  return redirect("/home", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export default function Signup() {
  const { error } = useLoaderData<typeof loader>();
  let actionResult = useActionData<typeof action>();

  return (
    <Container size="sm">
      <h2 id="signup-header">Sign up</h2>
      {error ? <div className="error">{error}</div> : null}
      <Form method="post">
        <div>
          <TextInput
            autoFocus
            error={actionResult?.errors?.email && (
              <span id="email-error">
                {actionResult.errors.email}
              </span>
            )}
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={
              actionResult?.errors?.email ? "email-error" : "signup-header"
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
            error={actionResult?.errors?.password && (
              <span id="password-error">
                {actionResult.errors.password}
              </span>
            )}
            autoComplete="current-password"
            aria-describedby="password-error"
            required
          />
        </div>

        <Button type="submit">Sign in</Button>

        <div className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="underline" to="/login">
            Log in
          </Link>
        </div>
      </Form>
    </Container>
  )
}