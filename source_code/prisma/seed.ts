import { PrismaClient } from "@prisma/client";
import { createHash } from "~/utils/encryption";
import { UserRole, WorkshopType } from "~/utils/enums";

const db = new PrismaClient();

async function cleanup() {
  console.time("🧹 Cleaned up the database...");

  await db.instructorRegistrationRequest.deleteMany();
  await db.testRegistration.deleteMany();
  await db.test.deleteMany();
  await db.payment.deleteMany();
  await db.registration.deleteMany();
  await db.session.deleteMany();
  await db.workshop.deleteMany();
  await db.instructor.deleteMany();
  await db.participant.deleteMany();
  await db.admin.deleteMany();

  console.timeEnd("🧹 Cleaned up the database...");
}

async function createAdmin() {
  console.time("👤 Created admin...");

  await db.admin.create({
    data: {
      firstName: "John",
      lastName: "Smith",
      username: "admin",
      email: "admin@app.com",
      password: await createHash("password"),
      phoneNo: "1234567890",
      dob: new Date("1985-07-12"),
      street: "123 Admin Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      role: UserRole.ADMIN,
    },
  });

  console.timeEnd("👤 Created admin...");
}

async function createParticipants() {
  console.time("👥 Created participants...");

  await db.participant.create({
    data: {
      firstName: "Vamshi",
      lastName: "Krishna",
      username: "vamshikrishna",
      email: "vamsikrishnayarra123@gmail.com",
      password: await createHash("password"),
      street: "456 Member Lane",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      phoneNo: "1234567890",
      dob: new Date("1990-03-15"),
    },
  });

  await db.participant.create({
    data: {
      firstName: "Emily",
      lastName: "Wilson",
      username: "emily",
      email: "participant2@app.com",
      password: await createHash("password"),
      street: "789 Holy Street",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      phoneNo: "9876543210",
      dob: new Date("1988-11-20"),
    },
  });

  console.timeEnd("👥 Created participants...");
}

async function createInstructors() {
  console.time("🏋️ Created instructors...");

  await db.instructor.create({
    data: {
      firstName: "Praneetha",
      lastName: "Babburi",
      username: "praneetha",
      email: "praneethababburi@gmail.com",
      password: await createHash("password"),
      phoneNo: "5551234567",
      dob: new Date("1992-05-10"),
      street: "321 Trainer Blvd",
      city: "Miami",
      state: "FL",
      zip: "33101",
      ssn: "123456789",
    },
  });

  await db.instructor.create({
    data: {
      firstName: "Sarah",
      lastName: "Davis",
      username: "sarah",
      email: "instructor2@app.com",
      password: await createHash("password"),
      phoneNo: "5559876543",
      dob: new Date("1989-08-25"),
      street: "654 Coach Street",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      ssn: "987654321",
    },
  });

  console.timeEnd("🏋️ Created instructors...");
}

async function createWorkshopsAndSessions() {
  console.time("🏃 Created workshops and sessions...");

  const instructor = await db.instructor.findFirst({
    where: { email: "praneethababburi@gmail.com" },
  });

  if (instructor) {
    const webDevWorkshop = await db.workshop.create({
      data: {
        title: "Full-Stack Web Development",
        description: "Master modern web development with React, Node.js, and MongoDB",
        venue: "Tech Hub - Room 101",
        startDate: new Date("2024-12-19"),
        endDate: new Date("2024-12-23"),
        capacity: 20,
        price: 299,
        workshopType: WorkshopType.PAID,
      },
    });

    await db.session.create({
      data: {
        title: "Frontend Fundamentals",
        date: new Date("2024-12-19"),
        startTime: new Date("2024-12-19T09:00:00"),
        endTime: new Date("2024-12-19T12:00:00"),
        description: "Web Development",
        workshopId: webDevWorkshop.id,
        instructorId: instructor.id,
      },
    });

    const cloudWorkshop = await db.workshop.create({
      data: {
        title: "Cloud Architecture & DevOps",
        description: "Learn cloud architecture, CI/CD, and infrastructure as code",
        venue: "Tech Hub - Room 102",
        startDate: new Date("2024-12-24"),
        endDate: new Date("2024-12-28"),
        capacity: 15,
        price: 399,
        workshopType: WorkshopType.PAID,
      },
    });

    await db.session.create({
      data: {
        title: "AWS Fundamentals",
        date: new Date("2024-12-24"),
        startTime: new Date("2024-12-24T13:00:00"),
        endTime: new Date("2024-12-24T16:00:00"),
        description: "Cloud Computing",
        workshopId: cloudWorkshop.id,
        instructorId: instructor.id,
      },
    });

    // Add a free workshop
    const pythonWorkshop = await db.workshop.create({
      data: {
        title: "Python for Beginners",
        description: "Introduction to Python programming language and its basic concepts",
        venue: "Virtual Meeting Room",
        startDate: new Date("2024-12-30"),
        endDate: new Date("2024-12-30"),
        capacity: 50,
        price: 0,
        workshopType: WorkshopType.FREE,
      },
    });

    await db.session.create({
      data: {
        title: "Python Basics",
        date: new Date("2024-12-30"),
        startTime: new Date("2024-12-30T10:00:00"),
        endTime: new Date("2024-12-30T12:00:00"),
        description: "Programming",
        workshopId: pythonWorkshop.id,
        instructorId: instructor.id,
      },
    });
  }

  console.timeEnd("🏃 Created workshops and sessions...");
}

async function seed() {
  console.log("🌱 Seeding...\n");

  console.time("🌱 Database has been seeded");

  await cleanup();
  await createAdmin();
  await createParticipants();
  await createInstructors();
  await createWorkshopsAndSessions();

  console.timeEnd("🌱 Database has been seeded");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
