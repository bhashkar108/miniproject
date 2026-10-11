import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export interface StoredQuizOutcome {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
}

export const quizAttemptsTable = pgTable("tech_ai_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  quizName: text("quiz_name").notNull(),
  subject: text("subject").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  desiredCorrect: integer("desired_correct").notNull(),
  timeLimitSeconds: integer("time_limit_seconds").notNull(),
  timeSpentSeconds: integer("time_spent_seconds").notNull(),
  outcomes: jsonb("outcomes").$type<StoredQuizOutcome[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuizAttemptRecord = typeof quizAttemptsTable.$inferSelect;
