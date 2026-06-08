import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "~/styles/tailwind.css";

import { ColorSchemeScript } from "@mantine/core";
import { type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getToast } from "remix-toast";

import { Providers } from "~/components/providers";
import { DefaultErrorBoundary } from "~/components/ui/error-boundary";
import { getUser } from "~/lib/session.server";
import { useGlobalToast } from "~/utils/hooks/use-global-toast";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { headers: toastHeaders, toast } = await getToast(request);
  const user = await getUser(request);

  return json(
    {
      toast,
      user,
    },
    { headers: toastHeaders },
  );
};

export const meta: MetaFunction = () => {
  return [
    { title: "Workshop Management System" },
    { name: "description", content: "Workshop Management System" },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-full" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body className="h-full" suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { toast } = useLoaderData<typeof loader>();

  useGlobalToast(toast);

  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}

export function ErrorBoundary() {
  return <DefaultErrorBoundary />;
}

export function HydrateFallback() {
  return <h1>Loading...</h1>;
}
