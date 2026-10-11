import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export interface StoredQuizQuestion {
  id: string;
  number: number;
  question: string;
  options: string[];
  questionType: string;
  correctAnswerIndex: number | null;
  explanation: string;
  topic: string;
}

export const quizDocumentsTable = pgTable("tech_ai_quiz_documents", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  subject: text("subject").notNull().default("General"),
  questions: jsonb("questions").$type<StoredQuizQuestion[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuizDocumentRecord = typeof quizDocumentsTable.$inferSelect;
