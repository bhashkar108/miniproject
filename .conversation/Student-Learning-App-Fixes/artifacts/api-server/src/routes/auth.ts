import argon2 from "argon2";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, studentProfilesTable } from "@workspace/db";
import {
  LoginStudentBody,
  LoginStudentResponse,
  LogoutStudentResponse,
  RegisterStudentBody,
  RegisterStudentResponse,
  GetCurrentSessionResponse,
} from "@workspace/api-zod";
import {
  createSessionToken,
  requireAuth,
  SESSION_COOKIE,
  sessionCookieOptions,
  type AuthenticatedRequest,
} from "../lib/auth";

const router: IRouter = Router();

function getSessionUser(user: { id: number; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

router.get("/auth/session", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    res.status(401).json({ error: "Your account was not found. Please sign in again." });
    return;
  }
  res.json(GetCurrentSessionResponse.parse(getSessionUser(user)));
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash })
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });
  await db.insert(studentProfilesTable).values({
    userId: user.id,
    name,
    email,
  });

  const token = await createSessionToken(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.status(201).json(RegisterStudentResponse.parse(getSessionUser(user)));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  const token = await createSessionToken(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json(LoginStudentResponse.parse(getSessionUser(user)));
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.json(LogoutStudentResponse.parse({ message: "Signed out." }));
});

export default router;
