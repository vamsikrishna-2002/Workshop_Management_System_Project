import { AppShell, Avatar, Menu, Text, UnstyledButton } from "@mantine/core";
import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import {
  CalendarCheck2Icon,
  CalendarClockIcon,
  CalendarIcon,
  ChevronDownIcon,
  LogOutIcon,
} from "lucide-react";
import { cn } from "~/utils/misc";

import { requireUserId, validateUserRole } from "~/lib/session.server";
import { UserRole } from "~/utils/enums";
import { useAuth } from "~/utils/hooks/use-auth";
import { getInitials } from "~/utils/misc";
import { db } from "~/lib/prisma.server";
import { ResetPasswordModal } from "~/routes/resources+/reset-password";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  await validateUserRole(request, UserRole.INSTRUCTOR);

  const instructor = await db.instructor.findUnique({
    where: {
      id: userId,
    },
  });
  return json({ hasResetPassword: instructor!.hasResetPassword });
};

const navItems = [
  {
    icon: CalendarIcon,
    label: "Workshops",
    to: "/instructor/workshops",
  },
  {
    icon: CalendarClockIcon,
    label: "Sessions",
    to: "/instructor/sessions",
  },
  {
    icon: CalendarCheck2Icon,
    label: "Reservations",
    to: "/instructor/reservations",
  },
];

function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="relative">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/80" />

      <div className="relative flex items-center justify-between px-6 py-4">
        {/* Logo section */}
        <div className="flex items-center space-x-3">
          <Text
            className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent"
            component="span"
          >
            W
          </Text>
          <Text className="text-gray-600 text-lg font-medium">Workshop</Text>
        </div>

        {/* Updated Navigation items with active state */}
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative px-4 py-2 rounded-lg transition-colors",
                  isActive && "bg-sky-50",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg bg-gradient-to-r from-sky-600/0 to-blue-600/0 opacity-0 blur transition-opacity",
                    isActive ? "opacity-25" : "group-hover:opacity-25",
                  )}
                />
                <div className="relative flex items-center space-x-2">
                  <item.icon
                    className={cn(
                      "size-4 transition-colors",
                      isActive ? "text-sky-600" : "text-gray-600 group-hover:text-sky-600",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive ? "text-sky-600" : "text-gray-600 group-hover:text-sky-600",
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        <Menu position="bottom-end" shadow="lg" width={200}>
          <Menu.Target>
            <UnstyledButton className="flex items-center gap-3 rounded-lg bg-white/80 px-4 py-2">
              <div className="relative">
                <Avatar className="relative ring-2 ring-sky-500/10 " radius="md" size="sm">
                  {getInitials(user.name)}
                </Avatar>
              </div>
              <div className="grow text-left">
                <Text className="text-gray-700 text-sm font-medium" size="sm">
                  {user.name}
                </Text>
                <Text className="text-gray-500 text-xs" size="xs">
                  {user.email}
                </Text>
              </div>
              <ChevronDownIcon className="text-gray-400" size={16} />
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              className="text-gray-700 hover:bg-gray-50"
              leftSection={<LogOutIcon size={14} />}
              onClick={() => signOut()}
            >
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { hasResetPassword } = useLoaderData<typeof loader>();
  const { user } = useAuth();

  return (
    <AppShell
      header={{ height: 72 }}
      padding="md"
      styles={{
        main: {
          background: "transparent",
          paddingTop: "calc(var(--mantine-spacing-md) + 72px)",
        },
      }}
    >
      <AppShell.Header className="border-b border-gray-200 bg-gradient-to-br from-sky-100/40 to-blue-100/40">
        <Navbar />
      </AppShell.Header>

      <AppShell.Main>
        {/* Background wrapper */}
        <div className="fixed inset-0 -z-10">
          {/* Gradient backgrounds */}
          <div className="absolute inset-0">
            <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-sky-100/40 to-transparent" />
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-blue-100/40 to-transparent" />
          </div>

          {/* Pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-70" />

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-100/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative min-h-[calc(100vh-72px-2rem)]">
          <Outlet />
        </div>
      </AppShell.Main>

      <ResetPasswordModal hasResetPassword={hasResetPassword} onClose={() => {}} userId={user.id} />
    </AppShell>
  );
}
