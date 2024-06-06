import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
} from "@remix-run/react";
import { Button, TextInput, Container } from "@mantine/core";

import { sessionStorage } from "~/sessions";
import { generateHasuraJWT } from "~/auth/hasura";
import { validateLoginCreds } from "~/auth/validation";

export async function login(email: string, password: string) {
  await new Promise((resolve) => resolve(null))
  if (false) {
    return false
  }
  return 1
}

export const meta = () => {
  return [{ title: "Login" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  if (session.has("userId")) {
    // Redirect to the home page if they are already signed in.
    return redirect("/home");
  }

  const data = { error: session.get("error") };

  return json(data, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const errors = validateLoginCreds(email, password);
  if (errors) {
    return json({ ok: false, errors }, 400);
  }

  let userId = await login(email, password);
  if (userId === false) {
    session.flash("error", "Invalid credentials");

    // Redirect to the login page with an error message.
    return redirect("/login", {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

  session.set("userId", userId);

  const hasuraAccessToken = generateHasuraJWT({
    defaultRole: "user",
    allowedRoles: ["user"],
    otherClaims: {
      "X-Hasura-User-Id": userId.toString(),
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
      <h2 id="login-header">
        Log in
      </h2>
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
              actionResult?.errors?.email ? "email-error" : "login-header"
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

        <div>
          <Button type="submit">Sign in</Button>
        </div>
        <div className="text-sm text-slate-500">
          Don't have an account?{" "}
          <Link className="underline" to="/signup">
            Sign up
          </Link>
          .
        </div>
      </Form>
    </Container >
  );
}