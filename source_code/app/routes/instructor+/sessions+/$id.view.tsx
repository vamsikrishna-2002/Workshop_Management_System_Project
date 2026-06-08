import {
  Box,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/lib/prisma.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";
import { useEffect } from "react";

const TestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  venue: z.string().min(1, "Venue is required"),
  capacity: z.string().transform((val) => Number.parseInt(val, 10)),
  questions: z.string().transform((str) => str.split("\n").filter((q) => q.trim())),
});

type ActionData = {
  fieldErrors?: inferErrors<typeof TestSchema>;
  success: boolean;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const sessionId = params.id;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      tests: true,
      workshop: true,
    },
  });

  if (!session) {
    throw new Response("Session not found", { status: 404 });
  }

  return json({ session });
}

export async function action({ request, params }: LoaderFunctionArgs) {
  const sessionId = params.id;

  const { fields, fieldErrors } = await validateAction(request, TestSchema);

  if (fieldErrors) {
    return json<ActionData>({ fieldErrors, success: false }, { status: 400 });
  }

  try {
    // Create base date from the input
    const testDate = new Date(fields.date);

    // Create start and end times for the test
    const [startHours, startMinutes] = fields.startTime.split(":");
    const [endHours, endMinutes] = fields.endTime.split(":");

    const startDateTime = new Date(testDate);
    startDateTime.setHours(
      Number.parseInt(startHours, 10),
      Number.parseInt(startMinutes, 10),
      0,
      0,
    );

    const endDateTime = new Date(testDate);
    endDateTime.setHours(Number.parseInt(endHours, 10), Number.parseInt(endMinutes, 10), 0, 0);

    await db.test.create({
      data: {
        title: fields.title,
        description: fields.description,
        date: testDate,
        startTime: startDateTime,
        endTime: endDateTime,
        venue: fields.venue,
        capacity: fields.capacity,
        questions: fields.questions,
        sessionId,
      },
    });

    return redirectWithSuccess(
      `/instructor/sessions/${sessionId}/view`,
      "Test created successfully",
    );
  } catch (error) {
    console.error("Test creation error:", error);
    return json<ActionData>(
      {
        fieldErrors: {
          startTime: "Invalid date/time format. Please check your inputs.",
        },
        success: false,
      },
      { status: 400 },
    );
  }
}

export default function SessionView() {
  const { session } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const navigate = useNavigate();

  const isSubmitting = fetcher.state !== "idle";
  const fieldErrors = fetcher.data?.fieldErrors;

  // Reset form on successful submission
  useEffect(() => {
    if (fetcher.state === "idle") {
      if (!fetcher.data?.fieldErrors) {
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) {
          form.reset();
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Box p="md">
      <Group mb="lg">
        <Button
          variant="subtle"
          leftSection={<ArrowLeftIcon size={16} />}
          onClick={() => navigate("/instructor/sessions")}
        >
          Back to Sessions
        </Button>
      </Group>

      <Title order={2} mb="md">
        Session: {session.title}
      </Title>

      <Paper shadow="xs" p="md" mb="xl">
        <Title order={3} mb="md">
          Create New Test
        </Title>
        <fetcher.Form method="post">
          <Stack>
            <TextInput id="title" name="title" label="Title" required error={fieldErrors?.title} />

            <Textarea
              id="description"
              name="description"
              label="Description"
              required
              minRows={3}
              error={fieldErrors?.description}
            />

            <Grid>
              <Grid.Col span={4}>
                <DateInput
                  id="date"
                  name="date"
                  label="Date"
                  required
                  error={fieldErrors?.date}
                  minDate={new Date()}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TimeInput
                  id="startTime"
                  name="startTime"
                  label="Start Time"
                  required
                  error={fieldErrors?.startTime}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TimeInput
                  id="endTime"
                  name="endTime"
                  label="End Time"
                  required
                  error={fieldErrors?.endTime}
                />
              </Grid.Col>
            </Grid>

            <TextInput id="venue" name="venue" label="Venue" required error={fieldErrors?.venue} />

            <NumberInput
              id="capacity"
              name="capacity"
              label="Capacity"
              required
              min={1}
              error={fieldErrors?.capacity}
            />

            <Textarea
              id="questions"
              name="questions"
              label="Questions (one per line)"
              required
              minRows={10}
              error={fieldErrors?.questions}
              description="Enter each question on a new line"
            />

            <Group justify="flex-end">
              <Button type="submit" loading={isSubmitting}>
                Create Test
              </Button>
            </Group>
          </Stack>
        </fetcher.Form>
      </Paper>

      <Title order={3} mb="md">
        Existing Tests
      </Title>
      <Stack>
        {session.tests.map((test) => (
          <Card key={test.id} shadow="xs">
            <Title order={4}>{test.title}</Title>
            <Text color="dimmed" size="sm" mb="md">
              {test.description}
            </Text>
            <Group justify="space-between">
              <Text size="sm">Date: {format(new Date(test.date), "PPP")}</Text>
              <Text size="sm">
                Time: {format(new Date(test.startTime), "p")} -{" "}
                {format(new Date(test.endTime), "p")}
              </Text>
              <Text size="sm">Venue: {test.venue}</Text>
              <Text size="sm">Capacity: {test.capacity}</Text>
            </Group>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
