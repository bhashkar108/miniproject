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
    father: text("father").notNull().default(""),
    mother: text("mother").notNull().default(""),
    village: text("village").notNull().default(""),
    district: text("district").notNull().default(""),
    college: text("college").notNull().default(""),
    section: text("section").notNull().default(""),
    branch: text("branch").notNull().default(""),
    course: text("course").notNull().default(""),
    subject: text("subject").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    dateOfBirth: text("date_of_birth").notNull().default(""),
    gender: text("gender").notNull().default(""),
    address: text("address").notNull().default(""),
    state: text("state").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    country: text("country").notNull().default(""),
    nationality: text("nationality").notNull().default(""),
    guardianName: text("guardian_name").notNull().default(""),
    guardianRelationship: text("guardian_relationship").notNull().default(""),
    guardianPhone: text("guardian_phone").notNull().default(""),
    admissionNumber: text("admission_number").notNull().default(""),
    semester: text("semester").notNull().default(""),
    academicYear: text("academic_year").notNull().default(""),
    profilePhoto: text("profile_photo").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tech_ai_student_profiles_user_id_unique").on(table.userId)],
);

export type User = typeof usersTable.$inferSelect;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
