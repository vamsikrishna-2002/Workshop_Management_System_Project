import { Box, Button, Container, Paper, Stack, Text, Title, Group } from "@mantine/core";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { db } from "~/lib/prisma.server";
import { requireUserId } from "~/lib/session.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const testId = params.testId;

  if (!testId) {
    return redirect("/reservations");
  }

  const testRegistration = await db.testRegistration.findFirst({
    where: {
      testId,
      participantId: userId,
    },
    include: {
      test: {
        include: {
          session: {
            include: {
              workshop: true,
              instructor: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      participant: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!testRegistration) {
    throw new Response("Test registration not found", { status: 404 });
  }

  return json({ testRegistration });
}

export default function TestCertificateView() {
  const { testRegistration } = useLoaderData<typeof loader>();
  const { test, participant } = testRegistration;

  return (
    <Container size="xl">
      <Box mb={32}>
        <Button
          component={Link}
          to={`/reservations/${test.session?.id}/view`}
          variant="subtle"
          leftSection={<ArrowLeftIcon size={16} />}
          color="gray"
        >
          Back to Session
        </Button>
      </Box>

      <Paper shadow="sm" withBorder p="xl" radius="lg">
        <Stack align="center" gap="lg">
          <Title order={1} size="h2" ta="center">
            Certificate of Completion
          </Title>

          <Text size="lg" ta="center">
            This is to certify that
          </Text>

          <Title order={2} size="h3" c="blue">
            {participant.firstName} {participant.lastName}
          </Title>

          <Text size="lg" ta="center">
            has successfully completed the test
          </Text>

          <Title order={3} size="h4">
            {test.title}
          </Title>

          <Text size="lg" ta="center">
            as part of the workshop
          </Text>

          <Title order={3} size="h4">
            {test.session?.workshop.title}
          </Title>

          <Group mt="xl">
            <Stack gap="xs">
              <Text fw={500} c="dimmed" size="sm">
                Test Date
              </Text>
              <Text>{format(new Date(test.date), "MMMM dd, yyyy")}</Text>
            </Stack>

            <Stack gap="xs">
              <Text fw={500} c="dimmed" size="sm">
                Instructor
              </Text>
              <Text>
                {test.session?.instructor?.firstName} {test.session?.instructor?.lastName}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Text fw={500} c="dimmed" size="sm">
                Completion Date
              </Text>
              <Text>{format(new Date(testRegistration.createdAt), "MMMM dd, yyyy")}</Text>
            </Stack>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
