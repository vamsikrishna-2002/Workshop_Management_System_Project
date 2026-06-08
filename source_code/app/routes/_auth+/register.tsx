import * as React from "react";

import { Button, Grid, PasswordInput, Select, Text, TextInput, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Link, useFetcher } from "@remix-run/react";
import { Wrench } from "lucide-react";

import { jsonWithError, redirectWithSuccess } from "remix-toast";
import { db } from "~/lib/prisma.server";
import { createUserSession } from "~/lib/session.server";
import { createHash } from "~/utils/encryption";
import { UserRole } from "~/utils/enums";
import { badRequest, safeRedirect } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";
import { RegisterSchema } from "~/utils/zod.schema";

interface ActionData {
  fieldErrors?: inferErrors<typeof RegisterSchema>;
  success: boolean;
}

export type SearchParams = {
  redirectTo?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { fieldErrors, fields } = await validateAction(request, RegisterSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({
      fieldErrors,
      success: false,
    });
  }

  if (fields.role === UserRole.PARTICIPANT) {
    const existingParticipantWithEmail = await db.participant.findUnique({
      where: {
        email: fields.email,
      },
    });

    if (existingParticipantWithEmail) {
      return badRequest<ActionData>({
        fieldErrors: {
          email: "Email already exists",
        },
        success: false,
      });
    }

    const existingParticipantWithUsername = await db.participant.findUnique({
      where: {
        username: fields.username,
      },
    });

    if (existingParticipantWithUsername) {
      return badRequest<ActionData>({
        fieldErrors: {
          username: "Username already exists",
        },
        success: false,
      });
    }

    const createdParticipant = await db.participant.create({
      data: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        username: fields.username,
        email: fields.email,
        password: await createHash(fields.password),
        street: fields.street,
        city: fields.city,
        state: fields.state,
        zip: fields.zip,
        dob: fields.dob,
        phoneNo: fields.phoneNo,
        role: UserRole.PARTICIPANT,
      },
    });

    return createUserSession({
      redirectTo: safeRedirect("/"),
      request,
      role: createdParticipant.role,
      userId: createdParticipant.id,
    });
  }

  if (fields.role === UserRole.INSTRUCTOR) {
    const existingManagerRequest = await db.instructorRegistrationRequest.findUnique({
      where: {
        email: fields.email,
      },
    });

    const existingInstructorWithEmail = await db.instructor.findUnique({
      where: {
        email: fields.email,
      },
    });

    const existingInstructorWithUsername = await db.instructor.findUnique({
      where: {
        username: fields.username,
      },
    });

    if (existingManagerRequest || existingInstructorWithEmail) {
      return jsonWithError<ActionData>(
        {
          fieldErrors: { email: "Email already exists" },
          success: false,
        },
        "Email already exists",
      );
    }

    if (existingInstructorWithUsername) {
      return jsonWithError<ActionData>(
        {
          fieldErrors: { username: "Username already exists" },
          success: false,
        },
        "Username already exists",
      );
    }

    await db.instructorRegistrationRequest.create({
      data: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        username: fields.username,
        email: fields.email,
        password: await createHash(fields.password),
        street: fields.street,
        city: fields.city,
        state: fields.state,
        zipCode: fields.zip,
        dob: fields.dob,
        phone: fields.phoneNo,
        ssn: fields.ssn ?? "",
      },
    });

    return redirectWithSuccess(
      "/login",
      "Instructor registration request created successfully. We will update you once its approved",
    );
  }
};

export default function Register() {
  const fetcher = useFetcher<ActionData>();
  const isPending = fetcher.state === "submitting";
  const [role, setRole] = React.useState<UserRole>(UserRole.PARTICIPANT);

  const inputStyles = {
    input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
    label: "text-slate-700",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-12 text-center">
        <div className="relative mx-auto mb-6 size-20 rounded-lg bg-gradient-to-br from-sky-100 to-blue-50 p-4">
          <Wrench className="size-12 text-sky-600" />
          <div className="absolute -right-2 -top-2 size-6 animate-ping rounded-full bg-sky-200" />
        </div>
        <Title className="font-industrial text-3xl font-bold text-slate-800" order={1}>
          Create Account
        </Title>
        <Text className="mt-2 text-slate-600">Join the Workshop Management System</Text>
      </div>

      <fetcher.Form method="post">
        <fieldset disabled={isPending}>
          <Select
            className="mb-4"
            classNames={inputStyles}
            data={Object.values(UserRole)
              .filter((role) => role !== UserRole.ADMIN)
              .map((role) => ({
                label: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
                value: role,
              }))}
            label="Select your role"
            name="role"
            onChange={(value) => setRole(value as UserRole)}
            size="sm"
            value={role}
          />

          <Grid gutter="sm">
            <Grid.Col span={6}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.firstName}
                error={fetcher.data?.fieldErrors?.firstName}
                label="First Name"
                name="firstName"
                required
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.lastName}
                error={fetcher.data?.fieldErrors?.lastName}
                label="Last Name"
                name="lastName"
                required
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.username}
                error={fetcher.data?.fieldErrors?.username}
                label="Username"
                name="username"
                required
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <DatePickerInput
                classNames={inputStyles}
                defaultValue={
                  fetcher.data?.fieldErrors?.dob
                    ? new Date(fetcher.data.fieldErrors.dob)
                    : undefined
                }
                error={fetcher.data?.fieldErrors?.dob}
                label="Date of Birth"
                maxDate={new Date()}
                name="dob"
                required
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.phoneNo}
                error={fetcher.data?.fieldErrors?.phoneNo}
                label="Phone Number"
                name="phoneNo"
                required
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.email}
                error={fetcher.data?.fieldErrors?.email}
                label="Email address"
                name="email"
                required
                size="sm"
                type="email"
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <PasswordInput
                classNames={{
                  ...inputStyles,
                  innerInput: "text-slate-900",
                }}
                defaultValue={fetcher.data?.fieldErrors?.password}
                error={fetcher.data?.fieldErrors?.password}
                label="Password"
                name="password"
                required
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <PasswordInput
                classNames={{
                  ...inputStyles,
                  innerInput: "text-slate-900",
                }}
                defaultValue={fetcher.data?.fieldErrors?.confirmPassword}
                error={fetcher.data?.fieldErrors?.confirmPassword}
                label="Confirm Password"
                name="confirmPassword"
                required
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.street}
                error={fetcher.data?.fieldErrors?.street}
                label="Street Address"
                name="street"
                required
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.city}
                error={fetcher.data?.fieldErrors?.city}
                label="City"
                name="city"
                required
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.state}
                error={fetcher.data?.fieldErrors?.state}
                label="State"
                name="state"
                required
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                classNames={inputStyles}
                defaultValue={fetcher.data?.fieldErrors?.zip}
                error={fetcher.data?.fieldErrors?.zip}
                label="ZIP Code"
                name="zip"
                required
                size="sm"
              />
            </Grid.Col>

            {role === UserRole.INSTRUCTOR && (
              <Grid.Col span={12}>
                <TextInput
                  classNames={inputStyles}
                  error={fetcher.data?.fieldErrors?.ssn}
                  label="SSN"
                  maxLength={9}
                  name="ssn"
                  required
                  size="sm"
                />
              </Grid.Col>
            )}
          </Grid>

          <Button
            className="mt-8 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
            fullWidth
            loading={isPending}
            size="md"
            type="submit"
          >
            {isPending ? "Creating account..." : "Create Account"}
          </Button>
        </fieldset>
      </fetcher.Form>

      <Text className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-medium text-sky-600 transition-colors hover:text-sky-500" to="/login">
          Sign in
        </Link>
      </Text>

      <Text className="mt-4 text-center text-xs text-slate-500">Workshop Management System</Text>
    </div>
  );
}
