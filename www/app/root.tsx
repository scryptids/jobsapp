/**
 * Remix root route for rendering the app shell and header.
 * The root loader runs on the root path and all child routes.
 * 
 * @module
 */

import '@mantine/core/styles.css';

import { json, LoaderFunctionArgs } from '@remix-run/node';
import {
  redirect,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { ColorSchemeScript, MantineProvider, AppShell, createTheme } from '@mantine/core';

import { sessionStorage } from '~/sessions';
import { Header } from '~/components/Header/Header';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );

  if (session.has("userId") && new URL(request.url).pathname === "/") {
    // Redirect to the home page if they are already signed in
    throw redirect("/home");
  }

  const data = {
    userId: session.get("userId") || null,
  }

  return json(data, {
    headers: {
      // "Set-Cookie": await sessionStorage.commitSession(session),
    }
  })
}

export function Layout({ children }: { children: React.ReactNode }) {
  let data = useLoaderData<typeof loader>();

  // add color overrides or customizations here
  const theme = createTheme({
  });

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
              breakpoint: 'sm',
              collapsed: { mobile: false },
            }}
            padding="md"
          >
            <AppShell.Header>
              <Header userId={data.userId}/>
            </AppShell.Header>
            <AppShell.Main>{children}</AppShell.Main>
          </AppShell>
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
