import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CalendarIcon, ChevronLeftIcon, ClockIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { db } from "~/lib/prisma.server";
import { formatDate, formatPrice, formatTime } from "~/utils/misc";

export async function loader({ params }: LoaderFunctionArgs) {
  const workshop = await db.workshop.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: {
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!workshop) {
    throw new Response("Workshop not found", { status: 404 });
  }

  return json({ workshop });
}

export default function WorkshopViewPage() {
  const { workshop } = useLoaderData<typeof loader>();

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
      </div>

      <div className="space-y-6">
        {/* Workshop Details Card */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-300">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{workshop.title}</h1>
                <p className="mt-1 text-sm text-gray-500">{workshop.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    workshop.workshopType === "PAID"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {workshop.workshopType}
                </span>
                {workshop.workshopType === "PAID" && workshop.price && (
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(workshop.price)}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>
                  {formatDate(new Date(workshop.startDate))} -{" "}
                  {formatDate(new Date(workshop.endDate))}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <MapPinIcon className="mr-2 h-4 w-4" />
                <span>{workshop.venue}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Capacity: {workshop.capacity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-300">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Sessions</h2>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {workshop.sessions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-500">No sessions scheduled yet</p>
              </div>
            ) : (
              workshop.sessions.map((session) => (
                <div key={session.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{session.title}</h3>
                      <p className="text-sm text-gray-500">{session.description}</p>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                      <UsersIcon className="mr-2 h-4 w-4" />
                      {session.instructor ? (
                        <span>
                          {session.instructor.firstName} {session.instructor.lastName}
                        </span>
                      ) : (
                        <span className="text-gray-400">No instructor assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
