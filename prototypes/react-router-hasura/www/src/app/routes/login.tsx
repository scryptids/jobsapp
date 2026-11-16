/**
 * Log-in page. All decisions live in the login state machine; this module
 * maps requests to machine events and machine states to responses.
 * @module
 */

import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { LoginProblem } from "~/features/auth/loginMachine";
import { serverLoginMachine } from "~/features/auth/loginMachine.server";
import {
  devAutologinUserId,
  isDevAutologinEnabled,
} from "~/features/auth/devAutologin.server";
import type { CredentialErrors } from "~/features/auth/validation";
import {
  formDataToEvent,
  runMachineRequest,
  type RunMachineRequestResult,
} from "~/utils/machineRequest.server";
import { loginMachineCookie } from "~/app/cookies";
import { createUserSessionRedirect, sessionStorage } from "~/app/sessions";
import { homePath } from "~/app/routes";
import { LoginCredentialsForm } from "~/components/LoginCredentialsForm/LoginCredentialsForm";

export const meta: MetaFunction = () => [{ title: "Log in" }];

/** Which input the page should ask for next. */
export type LoginStep = "credentials" | "otp" | "lockedOut";

export type LoginViewData = {
  step: LoginStep;
  email: string;
  fieldErrors: CredentialErrors | null;
  error: string | undefined;
};

const problemMessages: Record<LoginProblem, string | undefined> = {
  invalidInput: undefined,
  badCredentials: "Invalid email or password.",
  badOtp: "That code didn't work. Please try again.",
  unavailable: "Something went wrong on our side. Please try again.",
};

const problemStatus: Record<LoginProblem, number> = {
  invalidInput: 400,
  badCredentials: 401,
  badOtp: 401,
  unavailable: 500,
};

const lockedOutMessage = "Too many failed attempts. Please try again later.";

type LoginRun = RunMachineRequestResult<typeof serverLoginMachine>;

/**
 * Turn the machine's state into a response: a session + redirect once
 * authenticated, otherwise the page data for the current step.
 */
async function respond(request: Request, { snapshot, setCookies }: LoginRun) {
  if (snapshot.matches("authenticated") && snapshot.output?.userId) {
    return createUserSessionRedirect(
      request,
      snapshot.output.userId,
      homePath,
      setCookies
    );
  }

  const { email, fieldErrors, problem } = snapshot.context;
  const locked = snapshot.matches("lockedOut");
  const view: LoginViewData = {
    step: locked ? "lockedOut" : snapshot.matches("awaitingOtp") ? "otp" : "credentials",
    email,
    fieldErrors,
    error: locked ? lockedOutMessage : problem ? problemMessages[problem] : undefined,
  };
  const status = locked ? 429 : problem ? problemStatus[problem] : 200;
  return data(view, {
    status,
    headers: setCookies.map((c): [string, string] => ["Set-Cookie", c]),
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  if (session.has("userId") && session.has("hasuraAccessToken")) {
    return redirect(homePath);
  }

  if (isDevAutologinEnabled()) {
    // Development convenience: sign in as the seeded user without credentials.
    const run = await runMachineRequest({
      machine: serverLoginMachine,
      request,
      event: null,
      input: { autologinUserId: devAutologinUserId },
    });
    return respond(request, run);
  }

  // Read an in-progress flow (e.g. waiting for a code, or locked out) so a
  // reload shows the right step. Read-only: on a document POST this loader
  // runs after the action in the same request, still seeing the old cookie,
  // so writing here would undo what the action just stored.
  const run = await runMachineRequest({
    machine: serverLoginMachine,
    request,
    event: null,
    cookie: loginMachineCookie,
  });
  return respond(request, { ...run, setCookies: [] });
}

export async function action({ request }: ActionFunctionArgs) {
  const event = formDataToEvent(await request.formData(), [
    "credentials.submit",
    "otp.submit",
  ] as const);
  if (!event) {
    return data<LoginViewData>(
      { step: "credentials", email: "", fieldErrors: null, error: "Unsupported request." },
      { status: 400 }
    );
  }

  const run = await runMachineRequest({
    machine: serverLoginMachine,
    request,
    event:
      event.type === "otp.submit"
        ? { type: event.type, otp: event.otp ?? "" }
        : { type: event.type, email: event.email ?? "", password: event.password ?? "" },
    cookie: loginMachineCookie,
  });
  return respond(request, run);
}

export default function Login() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const view = actionData ?? loaderData;
  // TODO: render a one-time code form when view.step === "otp".
  return (
    <LoginCredentialsForm
      defaultEmail={view?.email}
      error={view?.error}
      emailError={view?.fieldErrors?.email}
      passwordError={view?.fieldErrors?.password}
    />
  );
}
