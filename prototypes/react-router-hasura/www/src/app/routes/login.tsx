import {
  data,
  redirect,
  useActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { loginMachine } from "~/features/auth/loginMachine";
import { isDevAutologinEnabled } from "~/features/auth/devAutologin.server";
import { authenticateUser } from "~/features/auth/users.server";
import { validateLoginCreds } from "~/features/auth/validation";
import { asyncInterpret } from "~/utils/asyncInterpret";
import { loginMachineCookie } from "~/app/cookies";
import { createUserSessionRedirect, sessionStorage } from "~/app/sessions";
import { homePath } from "~/app/routes";
import { LoginCredentialsForm } from "~/components/LoginCredentialsForm/LoginCredentialsForm";

export const meta: MetaFunction = () => [{ title: "Log in" }];

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));

  if (session.has("userId") && session.has("hasuraAccessToken")) {
    // Redirect to the home page if they are already signed in.
    return redirect(homePath);
  }

  if (!isDevAutologinEnabled()) {
    // Render the credentials form.
    return null;
  }

  // Development convenience: sign in as the seeded user without credentials.
  try {
    const loginMachineState = await asyncInterpret(loginMachine, {
      timeoutMs: 3_000,
      input: { session },
    });

    // clear or set cookies based on state
    const headersInit: HeadersInit = [];
    if (
      loginMachineState.status === "done" &&
      loginMachineState.hasTag("success")
    ) {
      session = loginMachineState.output.session;
      headersInit.push([
        "Set-Cookie",
        await sessionStorage.commitSession(session),
      ]);
      headersInit.push([
        "Set-Cookie",
        await loginMachineCookie.serialize(null, { expires: new Date(0) }),
      ]);
    } else {
      headersInit.push([
        "Set-Cookie",
        await sessionStorage.destroySession(session),
      ]);
      headersInit.push([
        "Set-Cookie",
        await loginMachineCookie.serialize(loginMachineState),
      ]);
    }

    // redirect to current machine state (/dash if done and successful)
    return redirect(String(loginMachineState.value), {
      headers: headersInit,
    });
  } catch (e) {
    console.log(e);
    return redirect("/");
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const fieldErrors = validateLoginCreds(email, password);
  if (fieldErrors) {
    return data({ email, fieldErrors, error: undefined }, { status: 400 });
  }

  const userId = await authenticateUser(email, password);
  if (userId === null) {
    return data(
      { email, fieldErrors: null, error: "Invalid email or password." },
      { status: 401 }
    );
  }

  return createUserSessionRedirect(request, userId, homePath);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return (
    <LoginCredentialsForm
      defaultEmail={actionData?.email}
      error={actionData?.error}
      emailError={actionData?.fieldErrors?.email}
      passwordError={actionData?.fieldErrors?.password}
    />
  );
}
