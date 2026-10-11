import { Router, type IRouter } from "express";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db, progressTable, quizAttemptsTable } from "@workspace/db";
import {
  CreateProgressBody,
  CreateProgressResponse,
  GetDashboardSummaryResponse,
  ListProgressResponse,
} from "@workspace/api-zod";
import { getVisitorOwnerKey, requireVisitor, type VisitorRequest } from "../lib/auth";

const router: IRouter = Router();
type GuestProgressRecord = {
  id: number;
  kind: string;
  title: string;
  details: string;
  minutes: number;
  createdAt: string;
};
const guestProgress = new Map<string, GuestProgressRecord[]>();
let nextGuestProgressId = 1;
const MAX_GUEST_PROGRESS_OWNERS = 500;

router.get("/progress", requireVisitor, async (req, res): Promise<void> => {
  const visitorReq = req as VisitorRequest;
  if (!visitorReq.userId) {
    res.json(ListProgressResponse.parse(guestProgress.get(getVisitorOwnerKey(visitorReq)) ?? []));
    return;
  }
  const records = await db
    .select()
    .from(progressTable)
    .where(eq(progressTable.userId, visitorReq.userId))
    .orderBy(desc(progressTable.createdAt))
    .limit(100);
  res.json(
    ListProgressResponse.parse(
      records.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() })),
    ),
  );
});

router.post("/progress", requireVisitor, async (req, res): Promise<void> => {
  const parsed = CreateProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const visitorReq = req as VisitorRequest;
  if (!visitorReq.userId) {
    const ownerKey = getVisitorOwnerKey(visitorReq);
    if (!guestProgress.has(ownerKey) && guestProgress.size >= MAX_GUEST_PROGRESS_OWNERS) {
      const oldestOwner = guestProgress.keys().next().value;
      if (oldestOwner) guestProgress.delete(oldestOwner);
    }
    const record: GuestProgressRecord = {
      id: nextGuestProgressId++,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };
    guestProgress.set(ownerKey, [record, ...(guestProgress.get(ownerKey) ?? [])].slice(0, 100));
    res.status(201).json(CreateProgressResponse.parse(record));
    return;
  }
  const [record] = await db
    .insert(progressTable)
    .values({ userId: visitorReq.userId, ...parsed.data })
    .returning();
  res.status(201).json(
    CreateProgressResponse.parse({
      ...record,
      createdAt: record.createdAt.toISOString(),
    }),
  );
});

router.get("/dashboard/summary", requireVisitor, async (req, res): Promise<void> => {
  const visitorReq = req as VisitorRequest;
  if (!visitorReq.userId) {
    const records = guestProgress.get(getVisitorOwnerKey(visitorReq)) ?? [];
    res.json(
      GetDashboardSummaryResponse.parse({
        sessions: records.filter((record) => record.kind !== "quiz").length,
        quizzes: records.filter((record) => record.kind === "quiz").length,
        averageScore: 0,
        studyMinutes: records.reduce((total, record) => total + record.minutes, 0),
        recentActivity: records.slice(0, 5),
      }),
    );
    return;
  }
  const userId = visitorReq.userId;
  const [progressStats] = await db
    .select({
      sessions: count(),
      studyMinutes: sql<number>`coalesce(sum(${progressTable.minutes}), 0)`,
    })
    .from(progressTable)
    .where(and(eq(progressTable.userId, userId), ne(progressTable.kind, "quiz")));
  const [quizStats] = await db
    .select({
      quizzes: count(),
      averageScore: sql<number>`coalesce(avg((${quizAttemptsTable.score}::numeric / nullif(${quizAttemptsTable.totalQuestions}, 0)) * 100), 0)`,
    })
    .from(quizAttemptsTable)
    .where(eq(quizAttemptsTable.userId, userId));
  const recent = await db
    .select()
    .from(progressTable)
    .where(eq(progressTable.userId, userId))
    .orderBy(desc(progressTable.createdAt))
    .limit(5);

  res.json(
    GetDashboardSummaryResponse.parse({
      sessions: progressStats.sessions,
      quizzes: quizStats.quizzes,
      averageScore: Number(quizStats.averageScore),
      studyMinutes: Number(progressStats.studyMinutes),
      recentActivity: recent.map((record) => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
      })),
    }),
  );
});

export default router;
