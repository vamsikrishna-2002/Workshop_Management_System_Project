import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  BookIcon,
  DollarSignIcon,
  InfoIcon,
} from "lucide-react";
import { db } from "~/lib/prisma.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, formatTime, formatPrice } from "~/utils/misc";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const sessions = await db.session.findMany({
    where: {
      instructorId: userId,
    },
    include: {
      workshop: {
        include: {
          sessions: true,
        },
      },
      registrations: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return json({ sessions });
}

export default function InstructorSessionsPage() {
  const { sessions } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
        <p className="mt-1 text-sm text-gray-500">View all your assigned workshop sessions</p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No sessions assigned</h3>
            <p className="mt-1 text-sm text-gray-500">
              You currently have no workshop sessions assigned.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              to={`/instructor/workshops/${session.workshop.id}/view`}
              className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-300 transition-all hover:shadow-md"
            >
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        session.workshop.workshopType === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {session.workshop.workshopType}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                      Session {session.workshop.sessions.findIndex((s) => s.id === session.id) + 1}{" "}
                      of {session.workshop.sessions.length}
                    </span>
                  </div>
                  <div>
                    <Link
                      to={`/instructor/sessions/${session.id}/view`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      View Session
                    </Link>
                  </div>
                </div>

                {/* Workshop Details */}
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">{session.workshop.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                    {session.workshop.description}
                  </p>
                </div>

                {/* Session Details */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Session Details</h4>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{session.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{session.description}</p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>{formatDate(new Date(session.date))}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="mr-2 h-4 w-4" />
                    <span>
                      {formatTime(new Date(session.startTime))} -{" "}
                      {formatTime(new Date(session.endTime))}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <span>{session.workshop.venue}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <UsersIcon className="mr-2 h-4 w-4" />
                    <span>Capacity: {session.workshop.capacity}</span>
                  </div>
                  {session.workshop.workshopType === "PAID" && (
                    <div className="flex items-center text-sm text-gray-500">
                      <DollarSignIcon className="mr-2 h-4 w-4" />
                      <span>Workshop Price: {formatPrice(session.workshop.price || 0)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <BookIcon className="mr-2 h-4 w-4" />
                    <span>Registrations: {session.registrations.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Workshop Period:</span>
                  <span>
                    {formatDate(new Date(session.workshop.startDate))} -{" "}
                    {formatDate(new Date(session.workshop.endDate))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
