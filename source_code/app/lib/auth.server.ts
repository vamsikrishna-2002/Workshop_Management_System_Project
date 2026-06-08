import type { Admin, Instructor, Participant } from "@prisma/client";
import bcrypt from "bcryptjs";

import { db } from "~/lib/prisma.server";
import { UserRole } from "~/utils/enums";

type AnyUser = Admin | Instructor | Participant;

type AdminReturn = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  role: typeof UserRole.ADMIN;
};

type ParticipantReturn = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  role: typeof UserRole.PARTICIPANT;
};

type InstructorReturn = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  role: typeof UserRole.INSTRUCTOR;
  hasResetPassword: boolean;
};

export type UserReturn = AdminReturn | ParticipantReturn | InstructorReturn;

export async function getUserById(id: AnyUser["id"]): Promise<UserReturn | null> {
  const [admin, participant, instructor] = await Promise.all([
    db.admin.findUnique({
      where: { id },
      select: {
        email: true,
        firstName: true,
        id: true,
        lastName: true,
        role: true,
      },
    }),
    db.participant.findUnique({
      where: { id },
      select: {
        email: true,
        firstName: true,
        id: true,
        lastName: true,
        role: true,
      },
    }),
    db.instructor.findUnique({
      where: { id },
      select: {
        email: true,
        firstName: true,
        id: true,
        lastName: true,
        role: true,
        hasResetPassword: true,
      },
    }),
  ]);

  if (admin) {
    return {
      ...admin,
      role: UserRole.ADMIN,
    } as AdminReturn;
  }

  if (participant) {
    return {
      ...participant,
      role: UserRole.PARTICIPANT,
    } as ParticipantReturn;
  }

  if (instructor) {
    return {
      ...instructor,
      role: UserRole.INSTRUCTOR,
    } as InstructorReturn;
  }

  return null;
}

export async function verifyLogin(
  emailOrUsername: string,
  password: string,
): Promise<UserReturn | null> {
  const [adminByEmail, adminByUsername] = await Promise.all([
    db.admin.findUnique({ where: { email: emailOrUsername } }),
    db.admin.findUnique({ where: { username: emailOrUsername } }),
  ]);
  const [participantByEmail, participantByUsername] = await Promise.all([
    db.participant.findUnique({ where: { email: emailOrUsername } }),
    db.participant.findUnique({ where: { username: emailOrUsername } }),
  ]);
  const [instructorByEmail, instructorByUsername] = await Promise.all([
    db.instructor.findUnique({ where: { email: emailOrUsername } }),
    db.instructor.findUnique({ where: { username: emailOrUsername } }),
  ]);

  const admin = adminByEmail || adminByUsername;
  const participant = participantByEmail || participantByUsername;
  const instructor = instructorByEmail || instructorByUsername;

  if (admin && (await bcrypt.compare(password, admin.password))) {
    const { password: _password, ...rest } = admin;
    return { ...rest, role: UserRole.ADMIN } as AdminReturn;
  }

  if (participant && (await bcrypt.compare(password, participant.password))) {
    const { password: _password, ...rest } = participant;
    return { ...rest, role: UserRole.PARTICIPANT } as ParticipantReturn;
  }

  if (instructor && (await bcrypt.compare(password, instructor.password))) {
    const { password: _password, ...rest } = instructor;
    return { ...rest, role: UserRole.INSTRUCTOR } as InstructorReturn;
  }

  return null;
}
