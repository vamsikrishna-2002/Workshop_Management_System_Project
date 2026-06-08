import {
  Box,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { format } from "date-fns";
import { ChevronLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/lib/prisma.server";
import { requireUserId } from "~/lib/session.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const sessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  description: z.string().min(1, "Description is required"),
});

interface ActionData {
  fieldErrors?: inferErrors<typeof sessionSchema>;
  success: boolean;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const instructorId = await requireUserId(request);

  const workshop = await db.workshop.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        where: { instructorId },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!workshop) {
    throw new Response("Workshop not found", { status: 404 });
  }

  return json({ workshop, instructorId });
}

export async function action({ request, params }: LoaderFunctionArgs) {
  const id = params.id;

  if (!id) {
    return redirect("/instructor/workshops");
  }

  const instructorId = await requireUserId(request);

  const { fieldErrors, fields } = await validateAction(request, sessionSchema);

  if (fieldErrors) {
    return json({ fieldErrors, fields }, { status: 400 });
  }

  try {
    const { date, startTime, endTime } = fields;

    // First get the current workshop to know its venue
    const currentWorkshop = await db.workshop.findUnique({
      where: { id },
    });

    if (!currentWorkshop) {
      throw new Error("Workshop not found");
    }

    // Create base date from the input
    const sessionDate = new Date(date);

    // Create start and end times for the session
    const [startHours, startMinutes] = startTime.split(":");
    const [endHours, endMinutes] = endTime.split(":");

    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(
      Number.parseInt(startHours, 10),
      Number.parseInt(startMinutes, 10),
      0,
      0,
    );

    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(Number.parseInt(endHours, 10), Number.parseInt(endMinutes, 10), 0, 0);

    // Check for conflicts across all workshops with the same venue
    const existingSessions = await db.session.findMany({
      where: {
        date: {
          equals: new Date(date),
        },
        workshop: {
          venue: {
            equals: currentWorkshop.venue,
            mode: "insensitive",
          },
        },
      },
      include: {
        workshop: {
          select: {
            title: true,
            venue: true,
          },
        },
        instructor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Find conflicting session if any
    const conflictingSession = existingSessions.find((existingSession) => {
      const existingStart = new Date(existingSession.startTime);
      const existingEnd = new Date(existingSession.endTime);

      // Check for any overlap
      return startDateTime <= existingEnd && endDateTime >= existingStart;
    });

    if (conflictingSession) {
      const conflictMessage = `This time slot conflicts with "${conflictingSession.title}" by ${
        conflictingSession.instructor?.firstName
      } ${conflictingSession.instructor?.lastName} in workshop "${
        conflictingSession.workshop.title
      }"`;

      return json(
        {
          fieldErrors: {
            startTime: conflictMessage,
          },
          fields,
        },
        { status: 400 },
      );
    }

    // Create session
    await db.session.create({
      data: {
        title: fields.title,
        description: fields.description,
        date: sessionDate,
        startTime: startDateTime,
        endTime: endDateTime,
        workshopId: id,
        instructorId,
      },
    });

    return redirectWithSuccess(`/instructor/workshops/${id}/view`, "Session created successfully");
  } catch (error) {
    console.error("Session creation error:", error);
    return json(
      {
        fieldErrors: {
          startTime: "Invalid date/time format. Please check your inputs.",
        },
        fields,
      },
      { status: 400 },
    );
  }
}

export default function WorkshopView() {
  const { workshop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const [errors, setErrors] = useState<{ [key: string]: string } | null>(null);
  const navigation = useNavigation();

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.state === "idle") {
      if (fetcher.data?.success) {
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) {
          form.reset();
        }

        setErrors(null);
      } else if (fetcher.data?.fieldErrors) {
        setErrors(fetcher.data.fieldErrors);
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) {
          form.reset();
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (navigation.state === "loading") {
      const form = document.querySelector("form") as HTMLFormElement;
      if (form) {
        form.reset();
      }
      setErrors(null);
    }
  }, [navigation.state]);

  return (
    <Container size="xl">
      <Box mb={32}>
        <Button
          component={Link}
          to="/instructor/workshops"
          variant="subtle"
          leftSection={<ChevronLeftIcon size={16} />}
          mb={16}
          color="gray"
        >
          Back to Workshops
        </Button>
        <Title order={1} size="h2" fw={700} c="gray.9">
          {workshop.title}
        </Title>
      </Box>

      <Stack gap="lg">
        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} c="dimmed">
                  Description
                </Text>
                <Text>{workshop.description}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} c="dimmed">
                  Venue
                </Text>
                <Text>{workshop.venue}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} c="dimmed">
                  Duration
                </Text>
                <Text>
                  {format(new Date(workshop.startDate), "MMM dd, yyyy")} -{" "}
                  {format(new Date(workshop.endDate), "MMM dd, yyyy")}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} c="dimmed">
                  Capacity
                </Text>
                <Text>{workshop.capacity} participants</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} c="dimmed">
                  Type
                </Text>
                <Text>
                  {workshop.workshopType.charAt(0) + workshop.workshopType.slice(1).toLowerCase()}
                </Text>
              </Grid.Col>
              {workshop.price && (
                <Grid.Col span={6}>
                  <Text size="sm" fw={500} c="dimmed">
                    Price
                  </Text>
                  <Text>${workshop.price}</Text>
                </Grid.Col>
              )}
            </Grid>
          </Stack>
        </Paper>

        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Create New Session
          </Title>
          <fetcher.Form method="post">
            <Stack gap="md">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput label="Session Title" name="title" required error={errors?.title} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Description"
                    name="description"
                    required
                    error={errors?.description}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <DateInput
                    label="Date"
                    name="date"
                    required
                    minDate={new Date(workshop.startDate)}
                    maxDate={new Date(workshop.endDate)}
                    error={errors?.date}
                    valueFormat="MMM DD, YYYY"
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <TimeInput
                    label="Start Time"
                    name="startTime"
                    required
                    error={errors?.startTime}
                    withSeconds={false}
                    type="time"
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <TimeInput
                    label="End Time"
                    name="endTime"
                    required
                    error={errors?.endTime}
                    withSeconds={false}
                    type="time"
                  />
                </Grid.Col>
              </Grid>

              <Group justify="flex-end" gap="sm">
                <Button
                  component={Link}
                  to="/instructor/workshops"
                  variant="subtle"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Session"}
                </Button>
              </Group>
            </Stack>
          </fetcher.Form>
        </Paper>

        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Your Sessions
          </Title>
          {workshop.sessions.length === 0 ? (
            <Text c="dimmed">No sessions created yet.</Text>
          ) : (
            <Stack gap="md">
              {workshop.sessions.map((session) => (
                <Paper key={session.id} withBorder p="md" radius="md">
                  <Text fw={700} size="lg" mb="xs">
                    {session.title}
                  </Text>
                  <Grid>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">
                        Date: {format(new Date(session.date), "MMM dd, yyyy")}
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">
                        Description: {session.description}
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">
                        Start: {format(new Date(session.startTime), "hh:mm a")}
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">
                        End: {format(new Date(session.endTime), "hh:mm a")}
                      </Text>
                    </Grid.Col>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
