import { Button, Modal, PasswordInput, ScrollArea } from "@mantine/core";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/react";
import { redirectWithSuccess } from "remix-toast";
import * as z from "zod";
import { db } from "~/lib/prisma.server";
import { createHash } from "~/utils/encryption";
import { useCallbackOnRouteChange } from "~/utils/hooks/use-callback-on-route-change";
import { useFetcherCallback } from "~/utils/hooks/use-fetcher-callback";
import { type inferErrors, validateAction } from "~/utils/validation";

const ResetPasswordSchema = z
  .object({
    userId: z.string(),
    password: z.string().trim().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().trim().min(8, "Password must be at least 8 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      return ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword", "password"],
      });
    }
  });

const RESET_PASSWORD_ROUTE = "/resources/reset-password";
const RESET_PASSWORD_FORM_ID = "reset-password-form";

interface ResetPasswordModalProps {
  userId: string;
  hasResetPassword: boolean;
  onClose: () => void;
  open?: boolean;
}

export interface ActionData {
  fieldErrors?: inferErrors<typeof ResetPasswordSchema>;
  success: boolean;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { fieldErrors, fields } = await validateAction(request, ResetPasswordSchema);

  if (fieldErrors) {
    return json({ fieldErrors, success: false });
  }

  const { password, userId } = fields;

  await db.instructor.update({
    where: {
      id: userId,
    },
    data: {
      hasResetPassword: true,
      password: await createHash(password),
    },
  });

  return redirectWithSuccess("/instructor", "Password reset successfully!");
};

export const ResetPasswordModal = ({
  hasResetPassword,
  onClose,
  userId,
}: ResetPasswordModalProps) => {
  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => onClose(),
  });

  useCallbackOnRouteChange(() => onClose());

  return (
    <Modal
      closeOnClickOutside={false}
      closeOnEscape={false}
      onClose={() => {}}
      opened={!hasResetPassword}
      padding="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <svg
            className="size-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          Reset Password
        </div>
      }
      withCloseButton={false}
    >
      <fetcher.Form
        className="flex flex-col gap-4"
        id={RESET_PASSWORD_FORM_ID}
        method="post"
        action={RESET_PASSWORD_ROUTE}
      >
        <input type="hidden" name="userId" value={userId} />

        <PasswordInput
          autoFocus={true}
          error={fetcher.data?.fieldErrors?.password}
          label="New Password"
          name="password"
          placeholder="Enter new password"
          required={true}
          type="password"
        />

        <PasswordInput
          error={fetcher.data?.fieldErrors?.confirmPassword}
          label="Confirm new password"
          name="confirmPassword"
          placeholder="Confirm new password"
          required={true}
          type="password"
        />

        <div className="mt-4 flex items-center justify-end gap-4">
          <Button
            className="bg-blue-600 hover:bg-blue-500"
            loading={fetcher.state === "submitting"}
            type="submit"
          >
            Reset Password
          </Button>
        </div>
      </fetcher.Form>
    </Modal>
  );
};
