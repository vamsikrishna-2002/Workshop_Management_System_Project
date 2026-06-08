import { Button, Select, TextInput, Textarea } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link, json, redirect, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { ChevronLeftIcon } from "lucide-react";
import * as React from "react";
import { redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/lib/prisma.server";
import { WorkshopType } from "~/utils/enums";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const EditWorkshopSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    venue: z.string().min(1, "Venue is required"),
    startDate: z
      .string()
      .refine((date) => !Number.isNaN(Date.parse(date)), {
        message: "Invalid start date",
      })
      .transform((date) => new Date(date)),
    endDate: z
      .string()
      .refine((date) => !Number.isNaN(Date.parse(date)), {
        message: "Invalid end date",
      })
      .transform((date) => new Date(date)),
    capacity: z
      .string()
      .min(1, "Capacity is required")
      .transform((val) => Number.parseInt(val, 10))
      .pipe(z.number().min(1, "Capacity must be at least 1")),
    price: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseFloat(val) : undefined))
      .pipe(z.number().min(0).optional()),
    workshopType: z.enum([WorkshopType.PAID, WorkshopType.FREE]),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.workshopType === WorkshopType.PAID) {
        return typeof data.price === "number" && data.price > 0;
      }
      return true;
    },
    {
      message: "Price is required for paid workshops",
      path: ["price"],
    },
  );

interface ActionData {
  fieldErrors?: inferErrors<typeof EditWorkshopSchema>;
  success: boolean;
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id;

  if (!id) {
    return redirect("/admin/workshops");
  }

  const workshop = await db.workshop.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!workshop) {
    return redirect("/admin/workshops");
  }

  return json({ workshop });
};

export async function action({ request, params }: ActionFunctionArgs) {
  const { fieldErrors, fields } = await validateAction(request, EditWorkshopSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors, success: false });
  }

  try {
    await db.workshop.update({
      where: {
        id: params.id,
      },
      data: {
        title: fields.title,
        description: fields.description,
        venue: fields.venue,
        startDate: fields.startDate,
        endDate: fields.endDate,
        capacity: fields.capacity,
        price: fields.workshopType === WorkshopType.PAID ? fields.price : undefined,
        workshopType: fields.workshopType,
      },
    });

    return redirectWithSuccess("/admin/workshops", "Workshop updated successfully");
  } catch (_error) {
    return badRequest<ActionData>({
      fieldErrors: {},
      success: false,
    });
  }
}

export default function NewWorkshopPage() {
  const fetcher = useFetcher<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { workshop } = useLoaderData<typeof loader>();
  const [workshopType, setWorkshopType] = React.useState<WorkshopType>(workshop.workshopType);

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <Link
          to="/admin/workshops"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeftIcon className="mr-1 h-4 w-4" />
          Back to Workshops
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Edit Workshop</h1>
      </div>

      <div className="mx-auto max-w-2xl">
        <fetcher.Form
          method="post"
          className="space-y-6 bg-white p-8 shadow-sm ring-1 ring-gray-900/5 rounded-lg"
        >
          <input type="hidden" name="id" value={workshop.id} />

          <TextInput
            name="title"
            label="Workshop Title"
            error={fetcher.data?.fieldErrors?.title}
            defaultValue={workshop.title}
            required
          />

          <Textarea
            name="description"
            label="Description"
            error={fetcher.data?.fieldErrors?.description}
            minRows={3}
            required
            defaultValue={workshop.description}
          />

          <TextInput
            name="venue"
            label="Venue"
            error={fetcher.data?.fieldErrors?.venue}
            required
            defaultValue={workshop.venue}
          />

          <div className="grid grid-cols-2 gap-6">
            <DatePickerInput
              name="startDate"
              label="Start Date"
              error={fetcher.data?.fieldErrors?.startDate}
              minDate={new Date()}
              required
              defaultValue={new Date(workshop.startDate)}
              valueFormat="MMM DD, YYYY"
            />
            <DatePickerInput
              name="endDate"
              label="End Date"
              error={fetcher.data?.fieldErrors?.endDate}
              minDate={new Date()}
              required
              defaultValue={new Date(workshop.endDate)}
              valueFormat="MMM DD, YYYY"
            />
          </div>

          <TextInput
            name="capacity"
            label="Capacity"
            error={fetcher.data?.fieldErrors?.capacity}
            min={1}
            required
            type="number"
            defaultValue={workshop.capacity}
          />

          <Select
            name="workshopType"
            label="Workshop Type"
            data={Object.values(WorkshopType).map((type) => ({
              value: type,
              label: type.charAt(0) + type.slice(1).toLowerCase(),
            }))}
            error={fetcher.data?.fieldErrors?.workshopType}
            required
            onChange={(value) => setWorkshopType(value as WorkshopType)}
            defaultValue={workshop.workshopType}
          />

          {workshopType === WorkshopType.PAID && (
            <TextInput
              type="number"
              name="price"
              label="Price (USD)"
              error={fetcher.data?.fieldErrors?.price}
              min={0}
              defaultValue={workshop.price?.toString()}
            />
          )}

          <div className="flex justify-end gap-4">
            <Button component={Link} to="/admin/workshops" variant="subtle" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Workshop"}
            </Button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
