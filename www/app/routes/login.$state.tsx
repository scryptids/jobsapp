import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { loginMachine } from "~/auth/loginMachine";
import { LoginCredentialsForm } from "~/components/LoginCredentialsForm/LoginCredentialsForm";
import { loginMachineCookie } from "~/cookies";
import { asyncInterpret } from "~/asyncInterpret";

export const readLoginMachineCookie = async (request: Request) => {
  const oldCookie = request.headers.get("Cookie");
  return await loginMachineCookie.parse(oldCookie);
};

export const loader = async ({ request, params: { state } }: LoaderFunctionArgs) => {
  const stateConfig = await readLoginMachineCookie(request);
  if (!stateConfig || !state) {
    // No cookie, so start over
    return redirect("..");
  }
  // Convert cookie into machine state
  const currentState = loginMachine.resolveState(stateConfig.value);
  if (stateConfig.value === state) {
    // The state from the cookie matches the url
    return json(
      currentState,
      currentState.status === "done" // Clear the cookie if we are done
        ? {
            headers: {
              "Set-Cookie": await loginMachineCookie.serialize(
                {},
                { expires: new Date(0) },
              ),
            },
          }
        : undefined,
    );
  } else {
    // Transition to the state that matches the url, and return that
    const transitionState = await asyncInterpret(loginMachine, {
      timeoutMs: 3_000,
      initialState: currentState,
      initialEvent: { type: "Goto", destination: state },
    })
    return json(transitionState, {
      headers: {
        "Set-Cookie": await loginMachineCookie.serialize(transitionState),
      },
    });
  }
};

export default function Login() {
  const state = useLoaderData<typeof loader>();

  switch (state.value) {
    case "submit":
      return <LoginCredentialsForm />;
    // case "mfa":
    //   return <LoginMfaForm />;
    case "/home":
      throw redirect("/home")
    default:
      return redirect("..");
  }
}
