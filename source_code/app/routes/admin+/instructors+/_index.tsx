import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/lib/prisma.server";
import { formatDate } from "~/utils/misc";

export async function loader() {
  const instructors = await db.instructor.findMany({
    orderBy: {
      firstName: "asc",
    },
  });

  return json({ instructors });
}

export default function InstructorsAdminPage() {
  const { instructors } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your workshop instructors and their information
          </p>
        </div>
        <Link
          to="new"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add New Instructor
        </Link>
      </div>

      <div className="mt-4 ring-1 ring-gray-300 rounded-lg bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900"
              >
                Name
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Email
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Phone
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                DOB
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                SSN
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Gender
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {instructors.map((instructor) => (
              <tr key={instructor.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                  <div className="font-medium text-gray-900">
                    {`${instructor.firstName} ${instructor.lastName}`}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {instructor.email}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {instructor.phoneNo}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {formatDate(new Date(instructor.dob))}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {instructor.ssn}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm">
                  <Link
                    to={`/admin/instructors/${instructor.id}/edit`}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Edit<span className="sr-only">, {instructor.firstName}</span>
                  </Link>
                </td>
              </tr>
            ))}
            {instructors.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-gray-500 text-base">No instructors found</p>
                    <p className="mt-1 text-sm text-gray-400">
                      Get started by adding a new instructor
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
