import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Modal,
  Radio,
  Select,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useFetcher } from "@remix-run/react";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { db } from "~/lib/prisma.server";
import { useDisclosure } from "@mantine/hooks";
import { z } from "zod";
import { redirectWithSuccess, redirectWithError } from "remix-toast";
import { type inferErrors, validateAction } from "~/utils/validation";
import { requireUserId } from "~/lib/session.server";
import * as React from "react";
import { PaymentMethod } from "~/utils/enums";

const PaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  cardNumber: z.string().optional(),
  cardHolder: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  amount: z.string().transform((val) => Number.parseFloat(val)),
});

interface ActionData {
  fieldErrors?: inferErrors<typeof PaymentSchema>;
  success: boolean;
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const sessionId = params.id;

  if (!sessionId) {
    return redirect("/sessions");
  }

  const [session, existingRegistration] = await Promise.all([
    db.session.findUnique({
      where: { id: sessionId },
      include: {
        workshop: true,
        tests: {
          orderBy: { date: "asc" },
        },
        instructor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        registrations: true,
      },
    }),
    db.registration.findFirst({
      where: {
        sessionId,
        participantId: userId,
      },
    }),
  ]);

  if (!session) {
    throw new Response("Session not found", { status: 404 });
  }

  return json({
    session,
    isRegistered: !!existingRegistration,
  });
}

function getAvailableSlots(capacity: number, registrations: number) {
  return Math.max(0, capacity - registrations);
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const sessionId = params.id;

  const { fields, fieldErrors } = await validateAction(request, PaymentSchema);

  if (fieldErrors) {
    return json({ fieldErrors, success: false });
  }

  try {
    // First, get the session details for the one being registered
    const targetSession = await db.session.findUnique({
      where: { id: sessionId },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!targetSession) {
      throw new Error("Session not found");
    }

    // Get all existing registrations for the user
    const existingRegistrations = await db.registration.findMany({
      where: {
        participantId: userId,
      },
      include: {
        session: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Check for time conflicts
    const hasConflict = existingRegistrations.some((registration) => {
      if (!registration.session) {
        return false;
      }

      const existingSession = registration.session;

      // Create start and end times for existing session
      const existingStart = new Date(existingSession.startTime);
      const existingEnd = new Date(existingSession.endTime);

      // Create start and end times for new session
      const newStart = new Date(targetSession.startTime);
      const newEnd = new Date(targetSession.endTime);

      // Check for overlap
      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });

    if (hasConflict) {
      return redirectWithError(
        `/sessions/${sessionId}/view`,
        "Cannot register for this session due to a time conflict with another registered session",
      );
    }

    // If no conflicts, proceed with registration
    await db.registration.create({
      data: {
        sessionId,
        participantId: userId,
        payment: {
          create: {
            amount: fields.amount,
            method: fields.method,
            participantId: userId,
          },
        },
      },
    });

    return redirectWithSuccess(
      `/sessions/${sessionId}/view`,
      "Registration completed successfully",
    );
  } catch (_error) {
    return json(
      {
        fieldErrors: {
          method: "Registration failed. Please try again.",
        },
        success: false,
      },
      { status: 400 },
    );
  }
}

export default function SessionView() {
  const { session, isRegistered } = useLoaderData<typeof loader>();
  const [opened, { open, close }] = useDisclosure(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.CASH);
  const fetcher = useFetcher<ActionData>();

  const availableSlots = getAvailableSlots(session.workshop.capacity, session.registrations.length);
  const isFull = availableSlots === 0;

  const showCardFields = paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD";

  return (
    <Container size="xl">
      <Box mb={32}>
        <Group justify="space-between" align="center">
          <Button
            component={Link}
            to="/sessions"
            variant="subtle"
            leftSection={<ArrowLeftIcon size={16} />}
            color="gray"
          >
            Back to Sessions
          </Button>
          <Stack gap={4} align="flex-end">
            {isFull && !isRegistered && (
              <Text c="red" size="sm" fw={500}>
                This session is full
              </Text>
            )}
            <Button
              onClick={open}
              disabled={isRegistered || isFull}
              variant={isRegistered || isFull ? "filled" : "default"}
              color={isRegistered || isFull ? "gray" : "blue"}
            >
              {isRegistered
                ? "Already Registered"
                : isFull
                  ? "Session Full"
                  : "Register for Session"}
            </Button>
          </Stack>
        </Group>
      </Box>

      <Stack gap="lg">
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
              <Text>{session.workshop.title}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Description
              </Text>
              <Text>{session.workshop.description}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Duration
              </Text>
              <Text>
                {format(new Date(session.workshop.startDate), "MMM dd, yyyy")} -{" "}
                {format(new Date(session.workshop.endDate), "MMM dd, yyyy")}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Venue
              </Text>
              <Text>{session.workshop.venue}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Price
              </Text>
              <Text>{session.workshop.price}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Capacity
              </Text>
              <Text>
                Available Slots: {availableSlots} of {session.workshop.capacity}
                {isFull && (
                  <Text span c="red" ml={8}>
                    (Full)
                  </Text>
                )}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Current Registrations
              </Text>
              <Text>{session.registrations.length}</Text>
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
              <Text>{session.title}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Description
              </Text>
              <Text>{session.description}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Date & Time
              </Text>
              <Text>
                {format(new Date(session.date), "MMMM dd, yyyy")}
                {" | "}
                {format(new Date(session.startTime), "hh:mm a")} -{" "}
                {format(new Date(session.endTime), "hh:mm a")}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text fw={500} c="dimmed" size="sm">
                Instructor
              </Text>
              <Text>
                {session.instructor?.firstName} {session.instructor?.lastName}
              </Text>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Tests Information */}
        <Paper shadow="sm" withBorder p="lg" radius="lg">
          <Title order={2} size="h3" mb="lg">
            Tests
          </Title>

          {session.tests.length === 0 ? (
            <Text c="dimmed">No tests available for this session.</Text>
          ) : (
            <Stack>
              {session.tests.map((test) => (
                <Card key={test.id} withBorder shadow="sm">
                  <Group justify="space-between" mb="xs">
                    <Title order={4}>{test.title}</Title>
                    <Text size="sm" c="dimmed">
                      Capacity: {test.capacity} participants
                    </Text>
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

      {!isRegistered && (
        <Modal opened={opened} onClose={close} title="Session Registration" size="md">
          <fetcher.Form method="post">
            <Stack>
              <Radio.Group
                label="Payment Method"
                name="method"
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <Group mt="xs">
                  <Radio label="Cash" value="CASH" />
                  <Radio label="Credit Card" value="CREDIT_CARD" />
                  <Radio label="Debit Card" value="DEBIT_CARD" />
                </Group>
              </Radio.Group>

              {showCardFields && (
                <>
                  <TextInput
                    label="Card Number"
                    name="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                  <TextInput
                    label="Card Holder Name"
                    name="cardHolder"
                    placeholder="John Doe"
                    required
                  />
                  <Group grow>
                    <TextInput label="Expiry Date" name="expiryDate" placeholder="MM/YY" required />
                    <TextInput label="CVV" name="cvv" placeholder="123" required maxLength={3} />
                  </Group>
                </>
              )}

              <NumberInput
                label="Amount"
                name="amount"
                required
                min={0}
                defaultValue={session.workshop.price?.toString() || "0"}
                readOnly={session.workshop.price !== null}
                hideControls
                leftSection="$"
              />

              <Group justify="flex-end" mt="md">
                <Button variant="subtle" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" loading={fetcher.state !== "idle"}>
                  Complete Registration
                </Button>
              </Group>
            </Stack>
          </fetcher.Form>
        </Modal>
      )}
    </Container>
  );
}
