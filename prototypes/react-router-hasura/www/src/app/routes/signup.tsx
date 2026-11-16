import {
  data,
  redirect,
  useActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { serverSignupMachine } from "~/features/auth/signupMachine.server";
import type { SignupProblem } from "~/features/auth/signupMachine";
import type { CredentialErrors } from "~/features/auth/validation";
import { formDataToEvent, runMachineRequest } from "~/utils/machineRequest.server";
import { createUserSessionRedirect, sessionStorage } from "~/app/sessions";
import { homePath } from "~/app/routes";
import { SignupForm } from "~/components/SignupForm/SignupForm";

export const meta: MetaFunction = () => [{ title: "Sign up" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  if (session.has("userId")) {
    return redirect(homePath);
  }
  return null;
}

type SignupActionData = {
  email: string;
  fieldErrors: CredentialErrors | null;
  error: string | undefined;
};

const problemStatus: Record<SignupProblem, number> = {
  invalidInput: 400,
  emailTaken: 409,
  unavailable: 500,
};

export async function action({ request }: ActionFunctionArgs) {
  const event = formDataToEvent(await request.formData(), [
    "credentials.submit",
  ] as const);
  if (!event) {
    return data<SignupActionData>(
      { email: "", fieldErrors: null, error: "Unsupported request." },
      { status: 400 }
    );
  }

  const { snapshot } = await runMachineRequest({
    machine: serverSignupMachine,
    request,
    event: {
      type: event.type,
      email: event.email ?? "",
      password: event.password ?? "",
    },
  });

  if (snapshot.matches("registered") && snapshot.output?.userId) {
    return createUserSessionRedirect(request, snapshot.output.userId, homePath);
  }

  const { email, fieldErrors, problem } = snapshot.context;
  return data<SignupActionData>(
    {
      email,
      fieldErrors,
      error:
        problem === "unavailable"
          ? "Something went wrong on our side. Please try again."
          : undefined,
    },
    { status: problem ? problemStatus[problem] : 400 }
  );
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  return (
    <SignupForm
      defaultEmail={actionData?.email}
      error={actionData?.error}
      emailError={actionData?.fieldErrors?.email}
      passwordError={actionData?.fieldErrors?.password}
    />
  );
}
