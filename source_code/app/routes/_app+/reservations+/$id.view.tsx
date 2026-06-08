import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import { ArrowLeftIcon, EyeIcon, AwardIcon, CheckCircleIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "~/lib/prisma.server";
import { requireUserId } from "~/lib/session.server";
import { TestStatus } from "~/utils/enums";
import { useFetcher } from "@remix-run/react";
import { toast } from "sonner";

interface ActionData {
  success: boolean;
  message?: string;
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const sessionId = params.id;

  if (!sessionId) {
    return redirect("/reservations");
  }

  const registration = await db.registration.findFirst({
    where: {
      sessionId,
      participantId: userId,
    },
    include: {
      session: {
        include: {
          workshop: true,
          tests: {
            include: {
              registrations: {
                where: {
                  participantId: userId,
                },
              },
            },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
          },
          instructor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!registration) {
    throw new Response("Registration not found", { status: 404 });
  }

  return json({ registration });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { testId, intent } = await request.json();

  if (!testId) {
    return json<ActionData>(
      {
        success: false,
        message: "Test ID is required",
      },
      { status: 400 },
    );
  }

  try {
    if (intent === "register") {
      await db.testRegistration.create({
        data: {
          testId,
          participantId: userId,
        },
      });

      return json<ActionData>({
        success: true,
        message: "Test registered successfully",
      });
    }

    if (intent === "complete") {
      await db.test.update({
        where: { id: testId },
        data: { status: TestStatus.COMPLETED },
      });

      return json<ActionData>({
        success: true,
        message: "Test completed successfully",
      });
    }

    return json<ActionData>({ success: false });
  } catch (_error) {
    return json<ActionData>(
      {
        success: false,
        message: "An error occurred. Please try again.",
      },
      { status: 500 },
    );
  }
}

export default function ReservedSessionView() {
  const { registration } = useLoaderData<typeof loader>();
  const { session } = registration;
  const [opened, { open, close }] = useDisclosure(false);
  const fetcher = useFetcher<ActionData>();

  type Question = string;
  type Test = {
    id: string;
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    capacity: number;
    questions: Question[];
  };

  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const handleViewQuestions = (test: Test) => {
    setSelectedTest(test);
    open();
  };

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.message) {
      toast.success(fetcher.data.message);
    } else if (!fetcher.data?.success && fetcher.data?.message) {
      toast.error(fetcher.data.message);
    }
  }, [fetcher.data, toast]);

  const handleRegisterTest = (testId: string) => {
    fetcher.submit({ testId, intent: "register" }, { method: "POST", encType: "application/json" });
  };

  const handleCompleteTest = (testId: string) => {
    fetcher.submit({ testId, intent: "complete" }, { method: "POST", encType: "application/json" });
  };

  return (
    <Container size="xl">
      <Box mb={32}>
        <Button
          component={Link}
          to="/reservations"
          variant="subtle"
          leftSection={<ArrowLeftIcon size={16} />}
          color="gray"
        >
          Back to Reservations
        </Button>
      </Box>

      <Stack gap="lg">
        {/* Payment Information */}
        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Registration Details
          </Title>
          <Grid>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Payment Method
              </Text>
              <Text>{registration.payment!.method}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Amount Paid
              </Text>
              <Text>${registration.payment!.amount}</Text>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Workshop Information */}
        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Workshop Details
          </Title>
          <Grid>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Workshop Title
              </Text>
              <Text>{session!.workshop.title}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Description
              </Text>
              <Text>{session!.workshop.description}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Duration
              </Text>
              <Text>
                {format(new Date(session!.workshop.startDate), "MMM dd, yyyy")} -{" "}
                {format(new Date(session!.workshop.endDate), "MMM dd, yyyy")}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Venue
              </Text>
              <Text>{session!.workshop.venue}</Text>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Session Information */}
        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Session Details
          </Title>
          <Grid>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Session Title
              </Text>
              <Text>{session!.title}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Description
              </Text>
              <Text>{session!.description}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Date & Time
              </Text>
              <Text>
                {format(new Date(session!.date), "MMMM dd, yyyy")} | {" | "}
                {format(new Date(session!.startTime), "hh:mm a")} -{" "}
                {format(new Date(session!.endTime), "hh:mm a")}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Instructor
              </Text>
              <Text>
                {session!.instructor?.firstName} {session!.instructor?.lastName}
              </Text>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Tests Information */}
        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Tests
          </Title>

          {session!.tests.length === 0 ? (
            <Text c="dimmed">No tests available for this session.</Text>
          ) : (
            <Stack>
              {session!.tests.map((test) => (
                <Card key={test.id} withBorder shadow="sm">
                  <Group justify="space-between" mb="xs">
                    <Title order={4}>{test.title}</Title>
                    <Group>
                      <Text size="sm" c="dimmed">
                        Capacity: {test.capacity} participants
                      </Text>

                      {test.registrations.length === 0 ? (
                        <Button
                          size="sm"
                          variant="filled"
                          loading={fetcher.state !== "idle"}
                          onClick={() => handleRegisterTest(test.id)}
                        >
                          Register for Test
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<EyeIcon size={16} />}
                            onClick={() => handleViewQuestions(test)}
                          >
                            View Questions
                          </Button>

                          {test.status === TestStatus.COMPLETED ? (
                            <Button
                              component={Link}
                              to={`/reservations/${test.id}/certificate`}
                              size="sm"
                              variant="light"
                              leftSection={<AwardIcon size={16} />}
                            >
                              View Certificate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="filled"
                              loading={fetcher.state !== "idle"}
                              onClick={() => handleCompleteTest(test.id)}
                              leftSection={<CheckCircleIcon size={16} />}
                            >
                              Complete Test
                            </Button>
                          )}
                        </>
                      )}
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed" mb="md">
                    {test.description}
                  </Text>
                  <Grid>
                    <Grid.Col span={4}>
                      <Text size="sm" fw={500} c="dimmed">
                        Date
                      </Text>
                      <Text size="sm">{format(new Date(test.date), "MMMM dd, yyyy")}</Text>
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Text size="sm" fw={500} c="dimmed">
                        Time
                      </Text>
                      <Text size="sm">
                        {format(new Date(test.startTime), "hh:mm a")} -{" "}
                        {format(new Date(test.endTime), "hh:mm a")}
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Text size="sm" fw={500} c="dimmed">
                        Venue
                      </Text>
                      <Text size="sm">{test.venue}</Text>
                    </Grid.Col>
                  </Grid>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

      {/* Questions Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Title order={3}>{selectedTest?.title} Questions</Title>}
        size="lg"
      >
        {selectedTest?.questions.map((question: Question, index: number) => (
          <Paper
            key={`question-${question}-${
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              index
            }`}
            withBorder
            p="md"
            mb="sm"
          >
            <Group align="flex-start">
              <Text fw={500} size="sm">
                {index + 1}.
              </Text>
              <Text size="sm">{question}</Text>
            </Group>
          </Paper>
        ))}
      </Modal>
    </Container>
  );
}
