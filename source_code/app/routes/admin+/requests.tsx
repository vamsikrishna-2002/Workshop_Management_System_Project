import { type ActionFunctionArgs, json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { redirectWithSuccess } from "remix-toast";
import { db } from "~/lib/prisma.server";
import { UserRole } from "~/utils/enums";

export async function loader() {
  const instructorRequests = await db.instructorRegistrationRequest.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return json({ instructorRequests });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const requestId = formData.get("requestId") as string;
  const action = formData.get("action") as "APPROVED" | "REJECTED";

  const registrationRequest = await db.instructorRegistrationRequest.update({
    where: { id: requestId },
    data: { status: action },
  });

  if (!registrationRequest) {
    return json({ success: false, error: "Registration request not found" }, { status: 404 });
  }

  if (action === "APPROVED") {
    await db.instructor.create({
      data: {
        firstName: registrationRequest.firstName,
        lastName: registrationRequest.lastName,
        email: registrationRequest.email,
        password: registrationRequest.password,
        phoneNo: registrationRequest.phone,
        dob: registrationRequest.dob,
        street: registrationRequest.street,
        city: registrationRequest.city,
        state: registrationRequest.state,
        zip: registrationRequest.zipCode,
        ssn: registrationRequest.ssn,
        role: UserRole.INSTRUCTOR,
      },
    });

    await db.instructorRegistrationRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    });

    return redirectWithSuccess("/admin/requests", "Instructor approved successfully");
  }

  await db.instructorRegistrationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
  });

  return redirectWithSuccess("/admin/requests", "Instructor rejected successfully");
}

export default function InstructorRequests() {
  const { instructorRequests } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructor Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Review and manage instructor applications</p>
        </div>
      </div>

      {instructorRequests.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No pending requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are currently no instructor registration requests to review.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instructorRequests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-300"
            >
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${request.status === "PENDING" && "bg-yellow-100 text-yellow-800"}
                      ${request.status === "APPROVED" && "bg-green-100 text-green-800"}
                      ${request.status === "REJECTED" && "bg-red-100 text-red-800"}
                    `}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">{`${request.firstName} ${request.lastName}`}</h3>
                  <p className="mt-1 text-sm text-gray-500">{request.email}</p>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900">SSN</h4>
                  <p className="mt-1 text-sm text-gray-500">{request.ssn}</p>
                </div>

                {request.status === "PENDING" && (
                  <div className="mt-6 flex space-x-3">
                    <Form method="post">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="action" value="APPROVED" />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500"
                      >
                        Approve
                      </button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="action" value="REJECTED" />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                      >
                        Reject
                      </button>
                    </Form>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
