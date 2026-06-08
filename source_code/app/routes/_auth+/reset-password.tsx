import { Button, PasswordInput, Text, Title } from "@mantine/core";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { KeyRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import { redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/lib/prisma.server";
import { createHash } from "~/utils/encryption";
import { type inferErrors, validateAction } from "~/utils/validation";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

interface ActionData {
  fieldErrors?: inferErrors<typeof ResetPasswordSchema>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return redirect("/forgot-password");
  }

  const passwordReset = await db.passwordReset.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      used: false,
    },
  });

  if (!passwordReset) {
    return redirect("/forgot-password");
  }

  return json({ token });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const { fieldErrors, fields } = await validateAction(request, ResetPasswordSchema);

  if (fieldErrors) {
    return json({ fieldErrors });
  }

  const { password } = fields;

  try {
    const passwordReset = await db.passwordReset.findFirst({
      where: {
        token: token ?? "",
        expiresAt: { gt: new Date() },
        used: false,
      },
    });

    if (!passwordReset) {
      return json({
        fieldErrors: { password: "Invalid or expired reset token" },
      });
    }

    // Update password based on user type
    if (passwordReset.participantId) {
      await db.participant.update({
        where: { id: passwordReset.participantId },
        data: { password: await createHash(password) },
      });
    } else if (passwordReset.adminId) {
      await db.admin.update({
        where: { id: passwordReset.adminId },
        data: { password: await createHash(password) },
      });
    } else if (passwordReset.instructorId) {
      await db.instructor.update({
        where: { id: passwordReset.instructorId },
        data: { password: await createHash(password) },
      });
    }

    // Mark token as used
    await db.passwordReset.update({
      where: { id: passwordReset.id },
      data: { used: true },
    });

    return redirectWithSuccess("/login", "Password updated successfully!");
  } catch (error) {
    console.error("Password reset error:", error);
    return json({
      fieldErrors: { password: "Failed to update password. Please try again." },
    });
  }
};

export default function ResetPassword() {
  const fetcher = useFetcher<ActionData>();
  const location = useLocation();
  const isSubmitting = fetcher.state !== "idle";
  const token = new URLSearchParams(location.search).get("token");

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-12 text-center">
        <div className="relative mx-auto mb-6 size-20 rounded-lg bg-gradient-to-br from-sky-100 to-blue-50 p-4">
          <KeyRound className="size-12 text-sky-600" />
          <div className="absolute -right-2 -top-2 size-6 animate-ping rounded-full bg-sky-200" />
        </div>
        <Title className="font-industrial text-3xl font-bold text-slate-800" order={1}>
          Reset Password
        </Title>
        <Text className="mt-2 text-slate-600">Enter your new password</Text>
      </div>

      <fetcher.Form method="post">
        <input type="hidden" name="token" value={token ?? ""} />
        <fieldset disabled={isSubmitting}>
          <div className="space-y-4">
            <PasswordInput
              label="New Password"
              id="password"
              name="password"
              required
              error={fetcher.data?.fieldErrors?.password}
              classNames={{
                input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                label: "text-slate-700",
                innerInput: "text-slate-900",
              }}
            />

            <PasswordInput
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              required
              error={fetcher.data?.fieldErrors?.confirmPassword}
              classNames={{
                input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                label: "text-slate-700",
                innerInput: "text-slate-900",
              }}
            />

            <Button
              type="submit"
              className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
              loading={isSubmitting}
              fullWidth
              size="md"
            >
              {isSubmitting ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </fieldset>
      </fetcher.Form>

      <Text className="mt-8 text-center text-xs text-slate-500">Workshop Management System</Text>
    </div>
  );
}
