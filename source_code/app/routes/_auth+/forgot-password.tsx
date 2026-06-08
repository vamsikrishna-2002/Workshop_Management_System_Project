import { Button, Text, TextInput, Title } from "@mantine/core";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Link, json, redirect, useFetcher } from "@remix-run/react";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { sendEmail } from "~/lib/mail.server";
import { db } from "~/lib/prisma.server";
import { generatePasswordResetToken } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const Schema = z
  .object({
    intent: z.literal("send_code").or(z.literal("verify_otp")).or(z.literal("reset_password")),
    email: z.string().email("Invalid email address").optional(),
    otp: z.string().length(6, "Code must be 6 digits").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    switch (data.intent) {
      case "send_code":
        if (!data.email) {
          ctx.addIssue({
            code: "custom",
            message: "Email is required",
            path: ["email"],
          });
        }
        break;
      case "verify_otp":
        if (!data.otp) {
          ctx.addIssue({
            code: "custom",
            message: "Code is required",
            path: ["otp"],
          });
        }
        break;
      case "reset_password":
        if (!data.otp) {
          ctx.addIssue({
            code: "custom",
            message: "Code is required",
            path: ["otp"],
          });
        }
        if (!data.password) {
          ctx.addIssue({
            code: "custom",
            message: "Password is required",
            path: ["password"],
          });
        }
        if (!data.confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: "Confirm password is required",
            path: ["confirmPassword"],
          });
        }
        if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: "Passwords don't match",
            path: ["confirmPassword"],
          });
        }
        break;
    }
  });

interface ActionData {
  fieldErrors?: inferErrors<typeof Schema>;
  success?: boolean;
  otpVerified?: boolean;
  email?: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const submission = await validateAction(request, Schema);

  if (submission.fieldErrors) {
    return json({ fieldErrors: submission.fieldErrors });
  }

  const { intent, email, otp } = submission.fields;

  if (intent === "send_code") {
    const participant = await db.participant.findUnique({
      where: { email },
    });

    const admin = await db.admin.findUnique({
      where: { email },
    });

    const instructor = await db.instructor.findUnique({
      where: { email },
    });

    const user = participant || admin || instructor;

    if (!user) {
      return json({ fieldErrors: { email: "No account found with this email" } }, { status: 400 });
    }

    const token = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    if (participant) {
      await db.passwordReset.create({
        data: {
          participantId: participant.id,
          token,
          expiresAt,
        },
      });
    } else if (admin) {
      await db.passwordReset.create({
        data: {
          adminId: admin.id,
          token,
          expiresAt,
        },
      });
    } else if (instructor) {
      await db.passwordReset.create({
        data: {
          instructorId: instructor.id,
          token,
          expiresAt,
        },
      });
    }

    await sendEmail({
      to: email,
      subject: "Reset Password",
      text: `Your password reset code is ${token}. It expires in 15 minutes.`,
    });

    return json<ActionData>({
      success: true,
      email,
    });
  }

  if (intent === "verify_otp") {
    try {
      const passwordReset = await db.passwordReset.findFirst({
        where: {
          token: otp,
          expiresAt: { gt: new Date() },
          used: false,
        },
        include: { user: true },
      });

      if (!passwordReset) {
        return json<ActionData>(
          {
            success: true,
            email,
            fieldErrors: { otp: "Invalid verification code. Please try again." },
          },
          { status: 400 },
        );
      }

      return redirect(`/reset-password?token=${otp}`);
    } catch (error) {
      console.error("OTP verification error:", error);
      return json<ActionData>({
        success: true,
        email,
        fieldErrors: { otp: "Failed to verify code. Please try again." },
      });
    }
  }

  return json({});
};

export default function ForgotPassword() {
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";
  const [currentOTP, setCurrentOTP] = useState("");

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
        <Text className="mt-2 text-slate-600">
          {fetcher.data?.success
            ? `Enter the verification code sent to ${fetcher.data.email}`
            : "We'll send you instructions to reset your password"}
        </Text>
      </div>

      {fetcher.data?.success ? (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="verify_otp" />
          <input type="hidden" name="email" value={fetcher.data.email} />
          <fieldset disabled={isSubmitting}>
            <div className="space-y-4">
              <TextInput
                label="Verification Code"
                id="otp"
                name="otp"
                value={currentOTP}
                onChange={(e) => setCurrentOTP(e.target.value)}
                maxLength={6}
                placeholder="Enter 6-digit code"
                error={fetcher.data?.fieldErrors?.otp}
                classNames={{
                  input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                  label: "text-slate-700",
                }}
              />

              <Button
                type="submit"
                className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
                loading={isSubmitting}
                disabled={currentOTP.length !== 6}
                fullWidth
                size="md"
              >
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </Button>

              <Text c="dimmed" size="sm" ta="center">
                Didn't receive the code?{" "}
                <Button
                  variant="subtle"
                  color="blue"
                  onClick={() => {
                    setCurrentOTP("");
                    fetcher.submit(
                      new URLSearchParams({
                        intent: "send_code",
                        email: fetcher.data!.email!,
                      }),
                      { method: "post" },
                    );
                  }}
                >
                  Send again
                </Button>
              </Text>
            </div>
          </fieldset>
        </fetcher.Form>
      ) : (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="send_code" />
          <fieldset disabled={isSubmitting}>
            <div className="space-y-4">
              <TextInput
                label="Email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                error={fetcher.data?.fieldErrors?.email}
                classNames={{
                  input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                  label: "text-slate-700",
                }}
              />

              <Button
                type="submit"
                className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
                loading={isSubmitting}
                fullWidth
                size="md"
              >
                {isSubmitting ? "Sending..." : "Send Reset Code"}
              </Button>
            </div>
          </fieldset>
        </fetcher.Form>
      )}

      <Text className="mt-8 text-center text-sm text-slate-600">
        Remember your password?{" "}
        <Link className="font-medium text-sky-600 transition-colors hover:text-sky-500" to="/login">
          Back to login
        </Link>
      </Text>

      <Text className="mt-8 text-center text-xs text-slate-500">Workshop Management System</Text>
    </div>
  );
}
