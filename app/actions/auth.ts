"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  createSession,
  deleteSession,
  setSessionCookie,
  deleteSessionCookie,
  cleanupExpiredSessions,
  getSession,
  hashToken,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validations";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = loginSchema.safeParse({ email, password });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: validation.data.email },
  });

  if (!user) {
    return {
      error: "Invalid email or password",
    };
  }

  if (!user.isActive) {
    return {
      error: "Account is inactive",
    };
  }

  if (user.role === "EDUCATOR") {
    const profile = await prisma.educatorProfile.findUnique({
      where: { userId: user.id },
      select: { isActive: true },
    });
    if (profile && !profile.isActive) {
      return {
        error: "Account is inactive",
      };
    }
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return {
      error: "Invalid email or password",
    };
  }

  // Cleanup expired sessions
  await cleanupExpiredSessions();

  // Track last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Create new session
  const token = await generateSessionToken();
  await createSession(user.id, token);
  await setSessionCookie(token);

  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    await deleteSession(token);
    await deleteSessionCookie();
  }

  return { success: true };
}

export async function logoutOtherSessionsAction() {
  const session = await getSession();
  if (!session) {
    return { error: "Non authentifié" };
  }

  const currentHash = await hashToken(session.token);
  await prisma.session.deleteMany({
    where: {
      userId: session.userId,
      NOT: { tokenHash: currentHash },
    },
  });

  return { success: true };
}

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const guardianId = formData.get("guardianId") as string;

  const validation = registerSchema.safeParse({
    name,
    email,
    password,
    role: "PARENT",
    guardianId: guardianId ? parseInt(guardianId) : undefined,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validation.data.email },
  });

  if (existingUser) {
    return {
      error: "Email already registered",
    };
  }

  // Verify guardian exists
  const guardian = await prisma.guardian.findUnique({
    where: { id: validation.data.guardianId },
  });

  if (!guardian) {
    return {
      error: "Guardian not found",
    };
  }

  // Check if guardian already has a user account
  if (guardian.userId) {
    return {
      error: "Guardian already has an account",
    };
  }

  const passwordHash = await hashPassword(validation.data.password);

  const user = await prisma.user.create({
    data: {
      name: validation.data.name,
      email: validation.data.email,
      passwordHash,
      role: validation.data.role,
    },
  });

  // Link to guardian
  await prisma.guardian.update({
    where: { id: validation.data.guardianId },
    data: { userId: user.id },
  });

  // Create session
  const token = await generateSessionToken();
  await createSession(user.id, token);
  await setSessionCookie(token);

  return { success: true };
}
