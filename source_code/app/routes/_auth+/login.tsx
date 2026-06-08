import { Button, Checkbox, PasswordInput, Text, TextInput, Title } from "@mantine/core";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Link, useFetcher } from "@remix-run/react";
import { Wrench } from "lucide-react";

import { verifyLogin } from "~/lib/auth.server";
import { createUserSession } from "~/lib/session.server";
import { badRequest, safeRedirect } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";
import { LoginSchema } from "~/utils/zod.schema";

interface ActionData {
  fieldErrors?: inferErrors<typeof LoginSchema>;
  success: boolean;
}

export type SearchParams = {
  redirectTo?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { fieldErrors, fields } = await validateAction(request, LoginSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors, success: false });
  }

  const { email, password, redirectTo, remember } = fields;

  const user = await verifyLogin(email, password);
  if (!user) {
    return badRequest<ActionData>({
      fieldErrors: {
        password: "Invalid username or password",
      },
      success: false,
    });
  }

  return createUserSession({
    redirectTo: safeRedirect(redirectTo),
    remember: remember === "on",
    request,
    role: user.role,
    userId: user.id,
  });
};

export default function Login() {
  const fetcher = useFetcher<ActionData>();
  const isPending = fetcher.state !== "idle";

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-12 text-center">
        <div className="relative mx-auto mb-6 size-20 rounded-lg bg-gradient-to-br from-sky-100 to-blue-50 p-4">
          <Wrench className="size-12 text-sky-600" />
          <div className="absolute -right-2 -top-2 size-6 animate-ping rounded-full bg-sky-200" />
        </div>
        <Title className="font-industrial text-3xl font-bold text-slate-800" order={1}>
          Workshop Portal
        </Title>
        <Text className="mt-2 text-slate-600">Sign in to accesss your account</Text>
      </div>

      <fetcher.Form className="space-y-6" method="post">
        <fieldset disabled={isPending}>
          <div className="space-y-5">
            <TextInput
              error={fetcher.data?.fieldErrors?.email}
              classNames={{
                input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                label: "text-slate-700",
              }}
              id="email"
              label="Email or username"
              name="email"
              placeholder="Enter your email or username"
              required
            />

            <PasswordInput
              error={fetcher.data?.fieldErrors?.password}
              classNames={{
                input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                label: "text-slate-700",
                innerInput: "text-slate-900",
              }}
              id="password"
              label="Password"
              name="password"
              required
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between">
                <Checkbox
                  id="remember"
                  label="Remember me"
                  name="remember"
                  size="sm"
                  classNames={{
                    label: "text-slate-600",
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Link
                  className="text-sm text-sky-600 transition-colors hover:text-sky-500"
                  to="/forgot-username"
                >
                  Forgot username?
                </Link>
                <Link
                  className="text-sm text-sky-600 transition-colors hover:text-sky-500"
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              fullWidth
              loading={isPending}
              size="md"
              type="submit"
              className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </fieldset>
      </fetcher.Form>

      <Text className="mt-8 text-center text-sm text-slate-600">
        Don't have an account?{" "}
        <Link
          className="font-medium text-sky-600 transition-colors hover:text-sky-500"
          to="/register"
        >
          Create an account
        </Link>
      </Text>

      <Text className="mt-8 text-center text-xs text-slate-500">Workshop Management System</Text>
    </div>
  );
}
