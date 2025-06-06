/**
 * Remix root route for rendering the app shell and header.
 * The root loader runs on the root path and all child routes.
 *
 * @module
 */

import "@mantine/core/styles.css";

import {
  data,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
} from "react-router";
import {
  redirect,
  Links,
  Meta,
  Outlet,
  // Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import {
  ColorSchemeScript,
  MantineProvider,
  AppShell,
  createTheme,
} from "@mantine/core";

import { sessionStorage } from "~/app/sessions";
import { Header } from "~/components/Header/Header";
import { homePath } from "./routes";
import type { Route } from "./+types/root";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  if (session.has("userId") && new URL(request.url).pathname === "/") {
    // Redirect to the home page if they are already signed in
    throw redirect(homePath);
  }

  const _data = {
    userId: session.get("userId") || null,
  };

  return data(_data, {
    headers: {
      // "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  let data = useLoaderData<typeof loader>();

  // add color overrides or customizations here
  const theme = createTheme({});

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <AppShell
            header={{ height: 60 }}
            navbar={{
              width: 300,
              breakpoint: "sm",
              collapsed: { mobile: false },
            }}
            padding="md"
          >
            <AppShell.Header>
              <Header userId={data?.userId} />
            </AppShell.Header>
            <AppShell.Main>{children}</AppShell.Main>
          </AppShell>
        </MantineProvider>
        <ScrollRestoration />
        {/* This <Scripts /> component is causing hydration mismatches */}
        {/* <Scripts /> */}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="">
          <code>{stack}</code>
        </pre>
      )}
    </div>
  );
}
