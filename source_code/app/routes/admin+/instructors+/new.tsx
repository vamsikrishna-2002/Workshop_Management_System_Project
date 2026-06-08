import { Button, PasswordInput, Select, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { type ActionFunctionArgs, json } from "@remix-run/node";
import { Link, useFetcher, useNavigation } from "@remix-run/react";
import { ChevronLeftIcon } from "lucide-react";
import { redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/lib/prisma.server";
import { createHash } from "~/utils/encryption";
import { UserRole } from "~/utils/enums";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const CreatInstructorSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zip: z.string().min(1, "ZIP code is required"),
    ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
    dob: z
      .string()
      .refine((date) => !Number.isNaN(Date.parse(date)), {
        message: "Invalid date format",
      })
      .transform((date) => new Date(date)),
    phoneNo: z.string().min(1, "Phone number is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

interface ActionData {
  fieldErrors?: inferErrors<typeof CreatInstructorSchema>;
  success: boolean;
}

export async function action({ request }: ActionFunctionArgs) {
  const { fieldErrors, fields } = await validateAction(request, CreatInstructorSchema);

  if (fieldErrors) {
    return json({ fieldErrors, fields });
  }

  const existingInstructorWithEmail = await db.instructor.findUnique({
    where: {
      email: fields.email,
    },
  });

  if (existingInstructorWithEmail) {
    return badRequest({ fieldErrors: { email: "Email already exists" }, success: false });
  }

  const existingInstructorWithUsername = await db.instructor.findUnique({
    where: {
      username: fields.username,
    },
  });

  if (existingInstructorWithUsername) {
    return badRequest({ fieldErrors: { username: "Username already exists" }, success: false });
  }

  try {
    await db.instructor.create({
      data: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        username: fields.username,
        email: fields.email,
        password: await createHash(fields.password),
        role: UserRole.INSTRUCTOR,
        street: fields.street,
        city: fields.city,
        state: fields.state,
        zip: fields.zip,
        dob: fields.dob,
        phoneNo: fields.phoneNo,
        ssn: fields.ssn,
      },
    });

    return redirectWithSuccess("/admin/instructors", "Instructor created successfully");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest({
        fieldErrors: { form: "An unexpected error occurred" },
        success: false,
      });
    }
  }
}

export default function NewInstructorPage() {
  const fetcher = useFetcher<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <Link
          to="/admin/instructors"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeftIcon className="mr-1 h-4 w-4" />
          Back to Instructors
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Add New Instructor</h1>
      </div>

      <div className="mx-auto max-w-2xl">
        <fetcher.Form
          method="post"
          className="space-y-6 bg-white p-8 shadow-sm ring-1 ring-gray-900/5 rounded-lg"
        >
          <div className="grid grid-cols-2 gap-6">
            <TextInput
              name="firstName"
              label="First Name"
              error={fetcher.data?.fieldErrors?.firstName}
              required
            />
            <TextInput
              name="lastName"
              label="Last Name"
              error={fetcher.data?.fieldErrors?.lastName}
              required
            />
          </div>
          <TextInput
            name="email"
            type="email"
            label="Email"
            error={fetcher.data?.fieldErrors?.email}
            required
          />
          <PasswordInput
            name="password"
            label="Password"
            error={fetcher.data?.fieldErrors?.password}
            required
          />
          <PasswordInput
            name="confirmPassword"
            label="Confirm Password"
            error={fetcher.data?.fieldErrors?.confirmPassword}
            required
          />
          <TextInput
            name="phoneNo"
            label="Phone Number"
            error={fetcher.data?.fieldErrors?.phoneNo}
            required
          />
          <TextInput
            name="ssn"
            label="SSN"
            error={fetcher.data?.fieldErrors?.ssn}
            required
            maxLength={9}
          />
          <DatePickerInput
            defaultValue={
              fetcher.data?.fieldErrors?.dob ? new Date(fetcher.data.fieldErrors.dob) : undefined
            }
            error={fetcher.data?.fieldErrors?.dob}
            label="Date of Birth"
            maxDate={new Date()}
            name="dob"
            required
            size="sm"
          />

          <div className="space-y-4">
            <TextInput
              name="street"
              label="Street Address"
              error={fetcher.data?.fieldErrors?.street}
              required
            />

            <div className="grid grid-cols-2 gap-6">
              <TextInput
                name="city"
                label="City"
                error={fetcher.data?.fieldErrors?.city}
                required
              />
              <TextInput
                name="state"
                label="State"
                error={fetcher.data?.fieldErrors?.state}
                required
              />
            </div>

            <TextInput
              name="zip"
              label="ZIP Code"
              error={fetcher.data?.fieldErrors?.zip}
              required
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button
              component={Link}
              to="/admin/instructors"
              variant="subtle"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Instructor"}
            </Button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
