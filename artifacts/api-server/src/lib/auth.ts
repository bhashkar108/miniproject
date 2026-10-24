import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";

export const SESSION_COOKIE = "tech_ai_session";
export const VISITOR_COOKIE = "tech_ai_visitor";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const VISITOR_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface AuthenticatedRequest extends Request {
  userId: number;
}

export interface VisitorRequest extends Request {
  userId?: number;
  visitorId: string;
}

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "tech-ai-form-assistant-dev-session-secret-key-32chars";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionKey());
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
  maxAge: SESSION_TTL_SECONDS * 1000,
};

const visitorCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
  maxAge: VISITOR_TTL_SECONDS * 1000,
};

export function getVisitorOwnerKey(req: VisitorRequest): string {
  return req.userId ? `user:${req.userId}` : `visitor:${req.visitorId}`;
}

/**
 * Allows study tools to run without an account. Authenticated users keep their
 * normal account scope; guests receive an unguessable, HTTP-only visitor cookie.
 */
export async function requireVisitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token.length > 0) {
    try {
      const { payload } = await jwtVerify(token, sessionKey());
      const userId = Number(payload.sub);
      if (Number.isSafeInteger(userId) && userId > 0) {
        (req as VisitorRequest).userId = userId;
        (req as VisitorRequest).visitorId = `account-${userId}`;
        next();
        return;
      }
    } catch {
      // An expired or invalid account session should not prevent guest use.
    }
  }

  const existingVisitorId = req.cookies?.[VISITOR_COOKIE];
  const visitorId =
    typeof existingVisitorId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existingVisitorId)
      ? existingVisitorId
      : randomUUID();

  (req as VisitorRequest).visitorId = visitorId;
  if (visitorId !== existingVisitorId) {
    res.cookie(VISITOR_COOKIE, visitorId, visitorCookieOptions);
  }
  next();
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, sessionKey());
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(401).json({ error: "Your session is invalid. Please sign in again." });
      return;
    }
    (req as AuthenticatedRequest).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}
