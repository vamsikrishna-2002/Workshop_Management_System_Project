import { Container } from "@mantine/core";
import type { LoaderFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";

import { validateUserRole } from "~/lib/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  await validateUserRole(request, null);
  return null;
};

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Abstract geometric patterns */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-sky-100/40 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-blue-100/40 to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-70" />
      </div>

      {/* Content */}
      <Container
        className="relative z-10 flex min-h-screen items-center justify-center p-4"
        size="md"
      >
        <div className="w-full">
          <Outlet />
        </div>
      </Container>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-100/80 to-transparent" />
    </div>
  );
}
