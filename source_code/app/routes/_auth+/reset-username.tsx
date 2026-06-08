import { Button, Text, TextInput, Title } from "@mantine/core";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { KeyRound } from "lucide-react";
import { z } from "zod";

import { db } from "~/lib/prisma.server";
import { badRequest, notFound } from "~/utils/misc.server";
import { validateAction } from "~/utils/validation";

const Schema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  token: z.string(),
});

interface LoaderData {
  currentUsername: string;
  token: string;
}

interface ActionData {
  fieldErrors?: {
    username?: string;
  };
  success?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return redirect("/forgot-username");
  }

  const usernameReset = await db.usernameReset.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      used: false,
    },
    include: {
      admin: true,
      participant: true,
      instructor: true,
    },
  });

  if (!usernameReset) {
    return redirect("/forgot-username");
  }

  const user = usernameReset.admin || usernameReset.participant || usernameReset.instructor;

  if (!user) {
    throw notFound({ message: "User not found" });
  }

  return json<LoaderData>({ currentUsername: user.username, token });
}

export async function action({ request }: ActionFunctionArgs) {
  const { fieldErrors, fields } = await validateAction(request, Schema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors, success: false });
  }

  const { username, token } = fields;

  const usernameReset = await db.usernameReset.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      used: false,
    },
    include: {
      admin: true,
      participant: true,
      instructor: true,
    },
  });

  if (!usernameReset) {
    return badRequest<ActionData>({
      fieldErrors: { username: "Invalid or expired token" },
      success: false,
    });
  }

  // Check if username is already taken
  const [existingAdmin, existingParticipant, existingInstructor] = await Promise.all([
    db.admin.findUnique({ where: { username } }),
    db.participant.findUnique({ where: { username } }),
    db.instructor.findUnique({ where: { username } }),
  ]);

  if (existingAdmin || existingParticipant || existingInstructor) {
    return badRequest<ActionData>({
      fieldErrors: { username: "Username is already taken" },
      success: false,
    });
  }

  try {
    // Update username based on user type
    if (usernameReset.admin) {
      await db.admin.update({
        where: { id: usernameReset.adminId! },
        data: { username },
      });
    } else if (usernameReset.participant) {
      await db.participant.update({
        where: { id: usernameReset.participantId! },
        data: { username },
      });
    } else if (usernameReset.instructor) {
      await db.instructor.update({
        where: { id: usernameReset.instructorId! },
        data: { username },
      });
    }

    // Mark token as used
    await db.usernameReset.update({
      where: { id: usernameReset.id },
      data: { used: true },
    });

    return redirect("/login");
  } catch (error) {
    console.error("Username update error:", error);
    return badRequest<ActionData>({
      fieldErrors: { username: "Failed to update username. Please try again." },
      success: false,
    });
  }
}

export default function ResetUsername() {
  const { currentUsername, token } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-12 text-center">
        <div className="relative mx-auto mb-6 size-20 rounded-lg bg-gradient-to-br from-sky-100 to-blue-50 p-4">
          <KeyRound className="size-12 text-sky-600" />
          <div className="absolute -right-2 -top-2 size-6 animate-ping rounded-full bg-sky-200" />
        </div>
        <Title className="font-industrial text-3xl font-bold text-slate-800" order={1}>
          Update Username
        </Title>
        <Text className="mt-2 text-slate-600">Enter your new username below</Text>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <fetcher.Form method="post" className="space-y-6">
          <input type="hidden" name="token" value={token} />
          <fieldset disabled={isSubmitting}>
            <div className="space-y-4">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Current username
                </Text>
                <Text size="lg" fw={500}>
                  {currentUsername}
                </Text>
              </div>

              <TextInput
                label="New Username"
                name="username"
                placeholder="Enter new username"
                required
                error={fetcher.data?.fieldErrors?.username}
                classNames={{
                  input: "bg-white border-slate-200 text-slate-900",
                  label: "text-slate-700",
                }}
              />

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
              >
                {isSubmitting ? "Updating..." : "Update Username"}
              </Button>
            </div>
          </fieldset>
        </fetcher.Form>
      </div>

      <Text className="mt-8 text-center text-sm text-slate-600">
        Remember your username?{" "}
        <Link className="font-medium text-sky-600 transition-colors hover:text-sky-500" to="/login">
          Back to login
        </Link>
      </Text>

      <Text className="mt-8 text-center text-xs text-slate-500">
        If you continue having trouble logging in, please contact support.
      </Text>
    </div>
  );
}
