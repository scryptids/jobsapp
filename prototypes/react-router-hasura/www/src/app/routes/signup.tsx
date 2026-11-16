import {
  data,
  redirect,
  useActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { createUser, EmailTakenError } from "~/features/auth/users.server";
import { validateSignupCreds } from "~/features/auth/validation";
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

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const fieldErrors = validateSignupCreds(email, password);
  if (fieldErrors) {
    return data({ email, fieldErrors }, { status: 400 });
  }

  let userId: number;
  try {
    userId = await createUser(email, password);
  } catch (e) {
    if (e instanceof EmailTakenError) {
      return data(
        { email, fieldErrors: { email: e.message, password: undefined } },
        { status: 409 }
      );
    }
    throw e;
  }

  return createUserSessionRedirect(request, userId, homePath);
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  return (
    <SignupForm
      defaultEmail={actionData?.email}
      emailError={actionData?.fieldErrors.email}
      passwordError={actionData?.fieldErrors.password}
    />
  );
}
