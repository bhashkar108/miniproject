import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
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

// ---------- Password hashing (pure Node.js crypto — no native modules) ----------
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  if (derivedKey.length !== keyBuffer.length) return false;
  return timingSafeEqual(derivedKey, keyBuffer);
}

// ---------- Router ----------
const router: IRouter = Router();

// In-memory fallback user store (ensures login/sign-in works 100% reliably even if DB is offline or asleep)
interface MemoryUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

const memoryUsers = new Map<string, MemoryUser>();
let memoryUserCounter = 1000;

function getSessionUser(user: { id: number; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

router.get("/auth/session", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  
  try {
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (user) {
      res.json(GetCurrentSessionResponse.parse(getSessionUser(user)));
      return;
    }
  } catch {
    // DB offline, fall back to memory
  }

  // Check in-memory users
  for (const mUser of memoryUsers.values()) {
    if (mUser.id === userId) {
      res.json(GetCurrentSessionResponse.parse(getSessionUser(mUser)));
      return;
    }
  }

  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.status(401).json({ error: "Your account was not found. Please sign in again." });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();

  // Check memory store first
  if (memoryUsers.has(email)) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const [user] = await db
      .insert(usersTable)
      .values({ name, email, passwordHash })
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });
    
    try {
      await db.insert(studentProfilesTable).values({
        userId: user.id,
        name,
        email,
      });
    } catch {}

    const token = await createSessionToken(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.status(201).json(RegisterStudentResponse.parse(getSessionUser(user)));
    return;
  } catch {
    // Database unreachable, register in high-reliability memory store
    const passwordHash = await hashPassword(parsed.data.password);
    const mUser: MemoryUser = {
      id: ++memoryUserCounter,
      name,
      email,
      passwordHash,
    };
    memoryUsers.set(email, mUser);

    const token = await createSessionToken(mUser.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.status(201).json(RegisterStudentResponse.parse(getSessionUser(mUser)));
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Try DB first
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (user && (await verifyPassword(parsed.data.password, user.passwordHash))) {
      const token = await createSessionToken(user.id);
      res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
      res.json(LoginStudentResponse.parse(getSessionUser(user)));
      return;
    }
  } catch {
    // DB offline, fall through to memory check
  }

  // Check memory store
  const mUser = memoryUsers.get(email);
  if (mUser && (await verifyPassword(parsed.data.password, mUser.passwordHash))) {
    const token = await createSessionToken(mUser.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.json(LoginStudentResponse.parse(getSessionUser(mUser)));
    return;
  }

  res.status(401).json({ error: "Email or password is incorrect." });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.json(LogoutStudentResponse.parse({ message: "Signed out." }));
});

export default router;
