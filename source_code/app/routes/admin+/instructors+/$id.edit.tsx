import { Button, Select, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { ChevronLeftIcon } from "lucide-react";
import { redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/lib/prisma.server";
import { UserRole } from "~/utils/enums";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const EditInstructorSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
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
});

interface ActionData {
  fieldErrors?: inferErrors<typeof EditInstructorSchema>;
  success: boolean;
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id;

  if (!id) {
    return redirect("/admin/instructors");
  }

  const instructor = await db.instructor.findUnique({
    where: { id },
  });

  if (!instructor) {
    return redirect("/admin/instructors");
  }

  return json({ instructor });
};

export async function action({ request, params }: ActionFunctionArgs) {
  const { fieldErrors, fields } = await validateAction(request, EditInstructorSchema);

  if (fieldErrors) {
    return json({ fieldErrors, fields });
  }

  const existingInstructor = await db.instructor.findFirst({
    where: {
      email: fields.email,
      NOT: { id: params.id },
    },
  });

  if (existingInstructor) {
    return badRequest({ fieldErrors: { email: "Email already exists" }, success: false });
  }

  try {
    await db.instructor.update({
      where: {
        id: fields.id,
      },
      data: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        email: fields.email,
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

    return redirectWithSuccess("/admin/instructors", "Instructor updated successfully");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest({
        fieldErrors: { form: "An unexpected error occurred" },
        success: false,
      });
    }
  }
}

export default function EditInstructorPage() {
  const fetcher = useFetcher<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const { instructor } = useLoaderData<typeof loader>();

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
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Edit Instructor</h1>
      </div>

      <div className="mx-auto max-w-2xl">
        <fetcher.Form
          method="post"
          className="space-y-6 bg-white p-8 shadow-sm ring-1 ring-gray-900/5 rounded-lg"
        >
          <input type="hidden" name="id" value={instructor.id} />

          <div className="grid grid-cols-2 gap-6">
            <TextInput
              name="firstName"
              label="First Name"
              error={fetcher.data?.fieldErrors?.firstName}
              required
              defaultValue={instructor.firstName}
            />
            <TextInput
              name="lastName"
              label="Last Name"
              error={fetcher.data?.fieldErrors?.lastName}
              required
              defaultValue={instructor.lastName}
            />
          </div>

          <TextInput
            name="email"
            type="email"
            label="Email"
            error={fetcher.data?.fieldErrors?.email}
            required
            defaultValue={instructor.email}
          />

          <TextInput
            name="phoneNo"
            label="Phone Number"
            error={fetcher.data?.fieldErrors?.phoneNo}
            required
            defaultValue={instructor.phoneNo}
          />

          <TextInput
            name="ssn"
            label="SSN"
            error={fetcher.data?.fieldErrors?.ssn}
            required
            maxLength={9}
            defaultValue={instructor.ssn}
          />

          <DatePickerInput
            error={fetcher.data?.fieldErrors?.dob}
            label="Date of Birth"
            maxDate={new Date()}
            name="dob"
            required
            size="sm"
            defaultValue={new Date(instructor.dob)}
          />

          <div className="space-y-4">
            <TextInput
              name="street"
              label="Street Address"
              error={fetcher.data?.fieldErrors?.street}
              required
              defaultValue={instructor.street}
            />

            <div className="grid grid-cols-2 gap-6">
              <TextInput
                name="city"
                label="City"
                error={fetcher.data?.fieldErrors?.city}
                required
                defaultValue={instructor.city}
              />
              <TextInput
                name="state"
                label="State"
                error={fetcher.data?.fieldErrors?.state}
                required
                defaultValue={instructor.state}
              />
            </div>

            <TextInput
              name="zip"
              label="ZIP Code"
              error={fetcher.data?.fieldErrors?.zip}
              required
              defaultValue={instructor.zip}
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
              {isSubmitting ? "Updating..." : "Update Instructor"}
            </Button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
