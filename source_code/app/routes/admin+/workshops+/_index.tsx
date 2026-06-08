import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { db } from "~/lib/prisma.server";
import { formatDate, formatPrice } from "~/utils/misc";

export async function loader() {
  const workshops = await db.workshop.findMany({
    include: {
      _count: {
        select: { sessions: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return json({ workshops });
}

export default function WorkshopsAdminPage() {
  const { workshops } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshops</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your workshop schedules and details</p>
        </div>
        <Link
          to="/admin/workshops/new"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add New Workshop
        </Link>
      </div>

      {workshops.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No workshops</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new workshop.</p>
            <div className="mt-6">
              <Link
                to="new"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Add Workshop
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workshops.map((workshop) => (
            <div
              key={workshop.id}
              className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-300 transition-all hover:shadow-md"
            >
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
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
                  <Link
                    to={`${workshop.id}/edit`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Edit
                  </Link>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">{workshop.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{workshop.description}</p>
                </div>

                <div className="mt-6 space-y-3">
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

              <div className="bg-gray-50 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">{workshop._count.sessions} Sessions</div>
                  <Link
                    to={`/admin/workshops/${workshop.id}/view`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View Sessions
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
