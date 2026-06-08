import { Card } from "@mantine/core";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BookIcon, CalendarIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { db } from "~/lib/prisma.server";
import { formatDate, formatTime } from "~/utils/misc";

export async function loader() {
  const reservations = await db.registration.findMany({
    include: {
      session: {
        include: {
          workshop: {
            include: {
              sessions: true,
            },
          },
          registrations: true,
        },
      },
      participant: true,
      payment: true,
    },
    orderBy: [{ session: { date: "asc" } }, { session: { startTime: "asc" } }],
  });

  return json({ reservations });
}

export default function ReservationsPage() {
  const { reservations } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Session Reservations</h1>
        <p className="mt-1 text-sm text-gray-500">View all reservations for your sessions</p>
      </div>

      {reservations.length === 0 ? (
        <Card className="rounded-lg border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No reservations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no reservations for your sessions at the moment.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reservations.map((reservation) => (
            <Card
              key={reservation.id}
              className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-300 transition-all hover:shadow-md"
            >
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        reservation.session?.workshop.workshopType === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {reservation.session?.workshop.workshopType}
                    </span>
                  </div>
                </div>

                {/* Participant Details */}
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {reservation.participant.firstName} {reservation.participant.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{reservation.participant.email}</p>
                </div>

                {/* Workshop Details */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Workshop Details</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {reservation.session?.workshop.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {reservation.session?.workshop.description}
                  </p>
                </div>

                {/* Session Details */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Session Details</h4>
                  <p className="mt-1 text-sm text-gray-900">{reservation.session?.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {reservation.session?.description}
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>{formatDate(new Date(reservation.session?.date ?? ""))}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="mr-2 h-4 w-4" />
                    <span>
                      {formatTime(new Date(reservation.session?.startTime ?? ""))} -{" "}
                      {formatTime(new Date(reservation.session?.endTime ?? ""))}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <span>{reservation.session?.workshop.venue}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <BookIcon className="mr-2 h-4 w-4" />
                    <span>Total Registrations: {reservation.session?.registrations.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Workshop Period:</span>
                  <span>
                    {formatDate(new Date(reservation.session?.workshop.startDate ?? ""))} -{" "}
                    {formatDate(new Date(reservation.session?.workshop.endDate ?? ""))}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
