import { useSubmit } from "@remix-run/react";

import { UserRole } from "~/utils/enums";
import { useRootData } from "~/utils/hooks/use-root-data";

export function useUser() {
  const { user } = useRootData();

  if (!user) {
    throw new Error("No user found");
  }

  return user;
}

export const useAuth = () => {
  const submit = useSubmit();
  const user = useUser();

  const isParticipant = user.role === UserRole.PARTICIPANT;
  const isInstructor = user.role === UserRole.INSTRUCTOR;
  const isAdmin = user.role === UserRole.ADMIN;

  const signOut = () => {
    return submit(null, {
      action: "/logout",
      method: "POST",
      navigate: false,
    });
  };

  const name =
    "firstName" in user && "lastName" in user ? `${user.firstName} ${user.lastName}` : "";

  return {
    signOut,
    isParticipant,
    isInstructor,
    isAdmin,
    user: {
      ...user,
      name,
    },
  };
};
