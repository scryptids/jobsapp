import {
  redirect,
  redirectDocument,
  type LoaderFunctionArgs,
} from "@remix-run/node";

import { loginMachine } from "~/auth/loginMachine";
// import { readLoginMachineCookie } from "./login.$state";
import { asyncInterpret } from "~/asyncInterpret";
import { loginMachineCookie } from "~/cookies";
import { sessionStorage } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  if (session.has("userId") && session.has("hasuraAccessToken")) {
    // Redirect to the home page if they are already signed in.
    return redirect("/home");
  }

  try {
    // const currentSnapshot = await readLoginMachineCookie(request);
    const loginMachineState = await asyncInterpret(loginMachine, {
      timeoutMs: 3_000,
      // initialState: currentSnapshot,
      input: { session },
    });

    // clear or set cookies based on state
    const headersInit: HeadersInit = []
    if (loginMachineState.status === 'done' && loginMachineState.hasTag('success')) {
      session = loginMachineState.output.session
      headersInit.push(["Set-Cookie", await sessionStorage.commitSession(session)])
      headersInit.push(["Set-Cookie", await loginMachineCookie.serialize(null, { expires: new Date(0) })])
    } else {
      headersInit.push(["Set-Cookie", await sessionStorage.destroySession(session)])
      headersInit.push(["Set-Cookie", await loginMachineCookie.serialize(loginMachineState)])
    }

    // redirect to current machine state (/home if done and successful)
    return redirect(String(loginMachineState.value), {
      headers: headersInit,
    });
  } catch (e) {
    console.log(e)
    return redirect("/")
  }
}

export default function Index() {
  return null;
}
