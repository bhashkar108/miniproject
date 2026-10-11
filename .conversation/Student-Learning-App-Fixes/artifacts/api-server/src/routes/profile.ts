import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, studentProfilesTable, usersTable } from "@workspace/db";
import {
  GetStudentProfileResponse,
  UpdateStudentProfileBody,
  UpdateStudentProfileResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  let [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, userId))
    .limit(1);

  if (!profile) {
    const [user] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Your account was not found." });
      return;
    }
    const [created] = await db
      .insert(studentProfilesTable)
      .values({ userId, name: user.name, email: user.email })
      .returning();
    profile = created;
  }

  res.json(
    GetStudentProfileResponse.parse({
      ...profile,
      updatedAt: profile.updatedAt.toISOString(),
    }),
  );
});

router.put("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateStudentProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  const [profile] = await db
    .insert(studentProfilesTable)
    .values({ userId, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentProfilesTable.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.json(
    UpdateStudentProfileResponse.parse({
      ...profile,
      updatedAt: profile.updatedAt.toISOString(),
    }),
  );
});

export default router;
