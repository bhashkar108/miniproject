import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, studentProfilesTable, usersTable } from "@workspace/db";
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

  res.json({
    ...profile,
    updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : new Date().toISOString(),
  });
});

router.put("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const b = req.body || {};

  // Exact 8 fields matching the website's profile section + photo
  const data = {
    name: typeof b.name === "string" ? b.name.slice(0, 120) : "",
    roll: typeof b.roll === "string" ? b.roll.slice(0, 100) : "",
    college: typeof b.college === "string" ? b.college.slice(0, 255) : "",
    branch: typeof b.branch === "string" ? b.branch.slice(0, 120) : "",
    course: typeof b.course === "string" ? b.course.slice(0, 120) : "",
    email: typeof b.email === "string" ? b.email.slice(0, 255) : "",
    phone: typeof b.phone === "string" ? b.phone.slice(0, 30) : "",
    semester: typeof b.semester === "string" ? b.semester.slice(0, 80) : "",
    profilePhoto: typeof b.profilePhoto === "string" ? b.profilePhoto.slice(0, 500000) : "",
  };

  const [profile] = await db
    .insert(studentProfilesTable)
    .values({ userId, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentProfilesTable.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();

  res.json({
    ...profile,
    updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : new Date().toISOString(),
  });
});

export default router;
