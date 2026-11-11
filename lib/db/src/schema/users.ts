import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "tech_ai_users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tech_ai_users_email_unique").on(table.email)],
);

export const studentProfilesTable = pgTable(
  "tech_ai_student_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    roll: text("roll").notNull().default(""),
    college: text("college").notNull().default(""),
    branch: text("branch").notNull().default(""),
    course: text("course").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    semester: text("semester").notNull().default(""),
    profilePhoto: text("profile_photo").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tech_ai_student_profiles_user_id_unique").on(table.userId)],
);

export type User = typeof usersTable.$inferSelect;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
